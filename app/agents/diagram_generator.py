# app/agents/diagram_generator.py

import os
import uuid
import logging

from google.cloud import firestore, vision, storage, aiplatform
from google.genai import Client as GenAIClient

logger = logging.getLogger("app.agents.diagram_generator")

# ─── Clients & Initialization ────────────────────────────────────────────────
# Firestore
db = firestore.Client()
# Cloud Storage
storage_client = storage.Client()
bucket = storage_client.bucket(os.environ["GCS_BUCKET_NAME"])
# Vertex AI (Image Generation)
aiplatform.init(
    project=os.environ["GOOGLE_CLOUD_PROJECT"],
    location=os.environ["GOOGLE_CLOUD_LOCATION"],
)
img_model = aiplatform.ImageGenerationModel.from_pretrained("text-bison@001")
# GenAI (for captions & translations)
genai = GenAIClient(
    vertexai=True,
    project=os.environ["GOOGLE_CLOUD_PROJECT"],
    location=os.environ["GOOGLE_CLOUD_LOCATION"],
)
# Vision (for auto-labeling)
vision_client = vision.ImageAnnotatorClient()


def run_diagram_pipeline(
    prompt: str,
    diagram_type: str,
    grade: int,
    subject: str,
    regenerate: int,
    user_id: str
) -> dict:
    """
    Executes:
      1. Prompt enrichment
      2. Image generation (Vertex AI)
      3. Auto-labeling (Vision API)
      4. Captioning & translation (GenAI)
      5. Storage (GCS + Firestore)
      6. Auto-publish to Resource Bazaar
    Returns a dict with diagram_id, images[], caption_en, caption_local.
    """
    # 1️⃣ Enrich the prompt
    enriched = (
        f"As a Grade {grade} {subject} teacher, "
        f"draw a {diagram_type} diagram of: {prompt}"
    )
    logger.debug("Enriched prompt: %s", enriched)

    images_info = []
    for i in range(regenerate):
        # 2️⃣ Generate image
        resp = img_model.predict(prompt=enriched, size="1024x1024", n=1)
        img_bytes = resp[0]
        img_id = str(uuid.uuid4())
        blob = bucket.blob(f"diagrams/{img_id}.png")
        blob.upload_from_string(img_bytes, content_type="image/png")
        url = blob.public_url
        images_info.append({"img_id": img_id, "url": url})
        logger.debug("Generated & uploaded image %s", img_id)

    # 3️⃣ Auto-label each image
    for info in images_info:
        content = bucket.blob(f"diagrams/{info['img_id']}.png").download_as_bytes()
        vresp = vision_client.label_detection(image=vision.Image(content=content))
        labels = [l.description for l in vresp.label_annotations][:10]
        info["labels"] = labels

    # 4️⃣ Captions
    cap_en = genai.generate_text(
        model="chat-bison@001",
        prompt=f"Provide a concise caption (max 30 words) for: {prompt}"
    ).text.strip()

    cap_loc = genai.generate_text(
        model="chat-bison@001",
        prompt=f"Translate into the local language: {cap_en}"
    ).text.strip()

    # 5️⃣ Store metadata in Firestore
    diag_ref = db.collection("diagrams").document()
    diagram_id = diag_ref.id
    diag_ref.set({
        "user_id": user_id,
        "created_at": firestore.SERVER_TIMESTAMP,
        "prompt": prompt,
        "diagram_type": diagram_type,
        "grade": grade,
        "subject": subject,
        "images": images_info,
        "caption_en": cap_en,
        "caption_local": cap_loc,
    })
    logger.debug("Stored diagram metadata %s", diagram_id)

    # 6️⃣ Auto-publish into Resource Bazaar
    res_ref = db.collection("resources").document()
    res_ref.set({
        "type": "diagram",
        "source_id": diagram_id,
        "title": f"{diagram_type.title()} Diagram: {prompt}",
        "description": cap_en,
        "tags": [subject.lower(), f"grade{grade}", diagram_type],
        "author_id": user_id,
        "created_at": firestore.SERVER_TIMESTAMP,
        "ratings": {},
        "avg_rating": 0,
    })
    logger.debug("Published diagram %s to Resource Bazaar", diagram_id)

    return {
        "diagram_id": diagram_id,
        "images": images_info,
        "caption_en": cap_en,
        "caption_local": cap_loc
    }
