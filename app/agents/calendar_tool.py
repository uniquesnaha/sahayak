# app/agents/calendar_tool.py

import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaInMemoryUpload

# Scopes for Calendar + Drive
SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive.file"
]
creds = service_account.Credentials.from_service_account_file(
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"],
    scopes=SCOPES
)

def manage_lesson_event(
    date: str,
    title: str,
    description: str,
    attachment_content: str
) -> dict:
    """
    1) Upload `attachment_content` to Drive as a .txt
    2) Create/update a Calendar event on `date` with `title` & `description`
    3) Attach the Drive file to the event

    Returns a dict:
      {
        "status": "created"|"updated",
        "message": "...confirmation...",
        "attachment_url": "https://..."
      }
    """
    # — Upload to Drive —
    drive = build("drive", "v3", credentials=creds)
    filename = f"{title}_{date}.txt"
    media = MediaInMemoryUpload(
        attachment_content.encode("utf-8"),
        mimetype="text/plain"
    )
    drive_file = drive.files().create(
        body={"name": filename},
        media_body=media,
        fields="id,webViewLink"
    ).execute()

    # Make it shareable
    drive.permissions().create(
        fileId=drive_file["id"],
        body={"role":"reader","type":"anyone"}
    ).execute()

    attachment = {
        "fileUrl":  drive_file["webViewLink"],
        "title":    filename,
        "mimeType": "text/plain"
    }

    # — Create or update the Calendar event —
    cal = build("calendar", "v3", credentials=creds)
    cal_id = os.environ.get("CALENDAR_ID", "primary")

    events = cal.events().list(
        calendarId=cal_id,
        timeMin=f"{date}T00:00:00Z",
        timeMax=f"{date}T23:59:59Z",
        q=title
    ).execute().get("items", [])

    body = {
        "summary":     title,
        "description": description,
        "start":       {"date": date},
        "end":         {"date": date},
        "attachments": [attachment]
    }

    if events:
        ev = events[0]
        ev.update(body)
        cal.events().update(
            calendarId=cal_id,
            eventId=ev["id"],
            body=ev,
            sendUpdates="all"
        ).execute()
        return {
            "status": "updated",
            "message": f"Updated event on {date} and attached your lesson plan.",
            "attachment_url": drive_file["webViewLink"]
        }
    else:
        cal.events().insert(
            calendarId=cal_id,
            body=body,
            sendUpdates="all"
        ).execute()
        return {
            "status": "created",
            "message": f"Created event on {date} and attached your lesson plan.",
            "attachment_url": drive_file["webViewLink"]
        }
