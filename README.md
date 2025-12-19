# Voice AI Agent - Full Stack Application

A complete React + Django voice AI agent interface with image upload, audio recording, and live chat capabilities.

## Features

### Frontend (React)
- 🎤 **Voice Recording** - Record audio directly from microphone
- 🖼️ **Image Upload** - Upload and send images to AI
- 💬 **Live Chat** - Real-time text chat interface
- 📱 **Responsive Design** - Works on desktop and mobile
- 🎨 **Modern UI** - Beautiful gradient design with smooth animations
- 🔊 **Audio Playback** - Listen to AI responses

### Backend (Django)
- **Session Management** - Maintain user chat sessions
- **Image Processing** - Handle image uploads with metadata
- **Audio Processing** - Receive audio files
- **Message Handling** - Store and manage conversations
- **CORS Support** - Enable React frontend communication
- **Placeholder APIs** - Easy integration with AI services

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Git

### Frontend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start React development server:**
   ```bash
   npm start
   ```
   
   App opens at `http://localhost:3000`

3. **Update API URLs** (if needed):
   Edit [src/components/VoiceAIAgent.js](src/components/VoiceAIAgent.js) and update the API endpoints to point to your Django backend.

### Backend Setup

1. **Create a new directory for the backend:**
   ```bash
   mkdir voice_ai_backend
   cd voice_ai_backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install Django packages:**
   ```bash
   pip install django djangorestframework django-cors-headers pillow
   ```

4. **Create Django project:**
   ```bash
   django-admin startproject voice_ai_backend .
   python manage.py startapp chat
   ```

5. **Copy backend files:**
   - Copy [backend/django_api/chat/views.py](backend/django_api/chat/views.py) to `chat/views.py`
   - Copy [backend/django_api/chat/urls.py](backend/django_api/chat/urls.py) to `chat/urls.py`
   - Copy [backend/django_api/voice_ai_backend/settings.py](backend/django_api/voice_ai_backend/settings.py) to `voice_ai_backend/settings.py`

6. **Update main urls.py:**
   ```python
   from django.contrib import admin
   from django.urls import path, include
   from django.conf import settings
   from django.conf.urls.static import static
   
   urlpatterns = [
       path('admin/', admin.site.urls),
       path('', include('chat.urls')),
   ]
   
   if settings.DEBUG:
       urlpatterns += static(settings.MEDIA_URL, 
                            document_root=settings.MEDIA_ROOT)
   ```

7. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

8. **Start Django development server:**
   ```bash
   python manage.py runserver
   ```
   
   Server runs at `http://localhost:8000`

## API Endpoints

### POST `/api/chat/initialize/`
Initialize a new chat session
```json
{
  "user_id": "user_123",
  "timestamp": "2024-12-11T10:30:00Z"
}
```

### POST `/api/chat/upload-image/`
Upload an image (multipart/form-data)
- `image` - Image file
- `session_id` - Session ID
- `description` - Optional image description

### POST `/api/chat/upload-audio/`
Upload audio for transcription (multipart/form-data)
- `audio` - Audio file (WAV format)
- `session_id` - Session ID
- `language` - Language code (default: en-US)

### POST `/api/chat/send-message/`
Send a text message
```json
{
  "session_id": "sess_abc123",
  "message": "Hello AI",
  "image_id": "img_xyz789" (optional),
  "timestamp": "2024-12-11T10:35:00Z"
}
```

### POST `/api/chat/get-response/`
Get AI response
```json
{
  "session_id": "sess_abc123",
  "message_type": "text_message|voice_message|analyze_image",
  "message_id": "msg_001",
  "timestamp": "2024-12-11T10:35:00Z"
}
```

### GET `/api/chat/history/<session_id>/`
Get chat history for a session

## Integration with AI Services

### 1. Speech-to-Text
Add transcription support in `views.py`:

```python
# Using OpenAI Whisper
from openai import OpenAI

client = OpenAI(api_key="your-api-key")
transcript = client.audio.transcriptions.create(
    model="whisper-1",
    file=audio_file,
    language=language
)
transcribed_text = transcript.text
```

### 2. Large Language Model (LLM)
Add AI responses in `views.py`:

```python
# Using OpenAI GPT
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": prompt}
    ],
    max_tokens=500
)
ai_response = response.choices[0].message.content
```

### 3. Text-to-Speech
Add voice responses:

```python
# Using OpenAI TTS
response = client.audio.speech.create(
    model="tts-1",
    voice="alloy",
    input=text
)
response.stream_to_file("output.mp3")
```

## Project Structure

```
ReactNative/
├── src/
│   ├── components/
│   │   ├── VoiceAIAgent.js      # Main AI agent component
│   │   ├── ChatBox.js            # Chat interface
│   │   ├── AudioRecorder.js      # Audio recording
│   │   └── ImageUploader.js      # Image upload
│   ├── styles/
│   │   └── VoiceAIAgent.css      # Styling
│   ├── App.js                    # Main app
│   ├── App.css                   # App styles
│   └── index.js                  # React entry point
├── public/
│   └── index.html
├── package.json
└── backend/
    ├── django_api/
    │   ├── chat/
    │   │   ├── views.py          # API endpoints
    │   │   └── urls.py           # URL routing
    │   └── voice_ai_backend/
    │       └── settings.py       # Django config
    └── SETUP_INSTRUCTIONS.md     # Full setup guide
```

## Development

### Frontend
- Edit [src/components/VoiceAIAgent.js](src/components/VoiceAIAgent.js) for main logic
- Edit [src/styles/VoiceAIAgent.css](src/styles/VoiceAIAgent.css) for styling
- Update API endpoints to match your backend

### Backend
- Implement actual AI service calls in `views.py`
- Add database models for persistence
- Configure CORS for your domain
- Set up proper authentication

## Configuration

### Environment Variables
Create `.env` file in project root:

```env
# React
REACT_APP_API_URL=http://localhost:8000

# Django
SECRET_KEY=your-secret-key
DEBUG=True
```

### CORS Settings
Update [backend/django_api/voice_ai_backend/settings.py](backend/django_api/voice_ai_backend/settings.py):

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://your-domain.com",
]
```

## Troubleshooting

### Microphone not accessible
- Check browser permissions
- Ensure using HTTPS in production
- Check microphone device is connected

### CORS errors
- Verify CORS middleware is in place
- Check CORS_ALLOWED_ORIGINS configuration
- Ensure backend is running on correct port

### Large file uploads fail
- Increase `DATA_UPLOAD_MAX_MEMORY_SIZE` in settings
- Check file size limits (default 10MB)

### Audio codec issues
- Ensure audio is WAV format from frontend
- Check browser audio recording support

## Production Deployment

See [backend/SETUP_INSTRUCTIONS.md](backend/SETUP_INSTRUCTIONS.md) for production deployment guidelines.

## License

MIT License - Feel free to use for your projects

## Support

For issues and questions:
1. Check the TODO comments in code for integration points
2. Review [backend/SETUP_INSTRUCTIONS.md](backend/SETUP_INSTRUCTIONS.md) for comprehensive setup
3. Verify API endpoints match your backend configuration
"# Project_Full_Integration_Front" 
