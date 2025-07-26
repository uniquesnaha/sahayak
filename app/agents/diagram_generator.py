# app/agents/diagram_generator.py

import os
import logging

# Vertex AI (Imagen 4)
import vertexai
from vertexai.preview.vision_models import ImageGenerationModel

logger = logging.getLogger("app.agents.diagram_generator")

# ─── Vertex AI Initialization ───────────────────────────────────────────────
vertexai.init(
    project=os.environ["GOOGLE_CLOUD_PROJECT"],
    location=os.environ["GOOGLE_CLOUD_LOCATION"],
)

# Load the Imagen 4 model
img_model = ImageGenerationModel.from_pretrained("imagen-4.0-generate-preview-06-06")


def run_diagram_pipeline(
    prompt: str,
    diagram_type: str,
    grade: int
) -> bytes:
    """
    Generates a single diagram image using Vertex AI Imagen 4 and returns raw PNG bytes.

    Args:
      prompt: The text to visualize.
      diagram_type: Type of diagram to draw.
      grade: Grade level (for prompt context).

    Returns:
      PNG image bytes.
    """
    # Enrich the prompt for context
    enriched = f"As a Grade {grade} teacher, draw a {diagram_type} diagram of: {prompt}"
    logger.debug("Enriched prompt: %s", enriched)

    # Generate exactly one image
    response = img_model.generate_images(
        prompt=enriched,
        number_of_images=1
    )
    gen_image = response.images[0]
    image_bytes = gen_image._image_bytes
    return image_bytes
