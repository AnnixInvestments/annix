# Voice Filter Setup and Usage Guide

Voice Filter is a speaker verification system that only allows authorized voices to pass through to your applications. This is useful for voice dictation, ensuring only your voice is transcribed.

## How It Works

```
Real Microphone --> Voice Filter --> VB-Cable (Virtual Audio) --> Windows/Apps
```

Voice Filter captures audio from your real microphone, verifies it matches your enrolled voice profile, and passes authorized audio through a virtual audio cable to your applications.

---

## Prerequisites

### 1. Install VB-Audio Virtual Cable

1. Download VB-Cable from: https://vb-audio.com/Cable/
2. Extract the downloaded ZIP file
3. Right-click VBCABLE_Setup_x64.exe and select **Run as administrator**
4. Click **Install Driver**
5. Restart your computer after installation

This creates two virtual audio devices:
- **CABLE Input** - Where Voice Filter sends audio TO
- **CABLE Output** - Where applications receive audio FROM

---

## Voice Filter Setup

### 1. Start the Voice Filter Server

```bash
cd voice-filter
npm install
npm run dashboard
```

The dashboard opens at http://localhost:47823

### 2. Enroll Your Voice Profile

1. Open the Voice Filter dashboard
2. Click **Start Enrollment**
3. Read the displayed sentences clearly into your microphone
4. Wait for enrollment to complete (you will see a success message)

### 3. Configure Audio Devices

In the Voice Filter dashboard, go to **Settings** (gear icon):

| Setting | Value |
|---------|-------|
| **Input Device** | Your real microphone (e.g., Microphone Realtek Audio) |
| **Output Device** | CABLE Input (VB-Audio Virtual Cable) |
| **VAD Sensitivity** | 0.01 (default) |
| **Verification Threshold** | 70% (adjust based on accuracy) |
| **Fail Open** | Enable if you want uncertain audio to pass through |

### 4. Configure Windows Default Microphone

1. Right-click the **speaker icon** in your taskbar
2. Select **Sound settings**
3. Under **Input**, set the default device to: **CABLE Output (VB-Audio Virtual Cable)**

This tells Windows to listen to the VB-Cable output where Voice Filter sends verified audio.

---

## Usage

### Starting the Filter

1. Open Voice Filter dashboard or Mini Mode
2. Click **Start Filter**
3. The status ring shows:
   - **Green (Authorized)** - Your voice is verified, audio passes through
   - **Red (Blocked)** - Unauthorized voice detected, audio is muted
   - **Yellow (Verifying)** - Analyzing voice...

### Mini Mode (Compact Window)

For quick access without the full dashboard:
1. Click **Mini Mode** button in the dashboard header
2. A compact popup window opens with essential controls
3. Use the Start/Stop button and monitor status

### Using with Windows Dictation (Win+H)

**Regional Restriction**: Windows dictation requires your Windows Region to be set to a supported country (e.g., United States). English (South Africa) is not supported.

**To change your region:**
1. Open **Settings > Time & Language > Language & region**
2. Under **Region**, change Country or region to **United States**
3. Under **Language**, ensure **English (United States)** is installed with Speech Recognition
4. Go to **Settings > Time & Language > Speech**
5. Set Speech language to **English (United States)**
6. Restart your computer

**To use dictation:**
1. Start Voice Filter
2. Press **Win+H** to open Windows dictation
3. Speak - your verified voice will be transcribed

### Using with Other Applications

Any application that uses the microphone will receive audio from Voice Filter:
- **Microsoft Teams/Zoom** - Set microphone to CABLE Output
- **Google Docs** - Use Voice Typing (Tools > Voice typing)
- **Discord** - Set input device to CABLE Output

---

## Troubleshooting

### Meters show 0% / No audio detected

- **Cause**: Wrong input device selected
- **Fix**: In Voice Filter Settings, ensure Input Device is your real microphone, NOT Sound Mapper or VB-Cable

### Filter stuck on Verifying

- **Cause**: Audio processing error or overflow
- **Fix**: Stop the filter, restart the Voice Filter server, and start again

### Voice not being recognized (low confidence)

- **Cause**: Voice profile may need re-enrollment
- **Fix**: Click **Re-enroll** to create a new voice profile

### Windows dictation says not supported in this region

- **Cause**: Windows regional restriction
- **Fix**: Change Windows Region to United States (see instructions above)

### CABLE Output not showing in Windows

- **Cause**: VB-Cable not installed correctly
- **Fix**: Reinstall VB-Cable as administrator and restart computer

### VAD Sensitivity too low/high

- **VAD Sensitivity 0.01**: Very sensitive, detects quiet speech
- **VAD Sensitivity 0.1+**: Requires louder speech to trigger
- Adjust in Settings based on your environment

---

## Quick Reference

| Component | Setting |
|-----------|---------|
| Voice Filter Input | Real microphone |
| Voice Filter Output | CABLE Input (VB-Audio Virtual Cable) |
| Windows/App Microphone | CABLE Output (VB-Audio Virtual Cable) |
| Windows Speech Language | English (United States) |
| Windows Region | United States (for Win+H dictation) |

---

## Files

- npm run dashboard - Start full dashboard
- npm run mini - Start with mini mode
- VoiceFilter.bat - Windows batch launcher
- VoiceFilter.hta - Windows HTA mini app
