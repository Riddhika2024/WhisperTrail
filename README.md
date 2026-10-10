# WhisperTrail 🌿

**Turn a walk into a memory.**

WhisperTrail is an outdoor journaling web app that encourages people to step away from their screens, notice the small details around them, and preserve those moments in a personal field journal.

## ✨ Features

- Get gentle prompts to notice the world outdoors.
- Upload a photo and write your own observation.
- Use open-source AI to generate an image caption.
- Turn observations into saved memories.
- Build a visual trail of your walk.
- Revisit saved moments in your Field Journal.

## 🧠 Open-source AI

WhisperTrail uses [Transformers.js](https://huggingface.co/docs/transformers.js) with the `Xenova/vit-gpt2-image-captioning` model for image captioning in the browser.

The model performs inference on the user's device after its required model files have been downloaded. WhisperTrail does not require a proprietary AI API for its image-captioning feature.

The app combines the image caption with the user's own observation to create a memory. The memory text uses templates rather than a separate generative language model.

## 🛠️ Built With

- HTML
- CSS
- JavaScript
- Vite
- Transformers.js
- IndexedDB for saving moments in the browser

## 🚀 Run Locally

1. Install [Node.js](https://nodejs.org/).
2. Clone this repository.
3. Open a terminal in the project folder.
4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open the local URL shown in your terminal.

The AI model may need an internet connection on its first load to download the required files.

## 🌱 Why Open Innovation Matters

Open-source tools make it possible to build useful AI experiences without depending on a proprietary inference API. Browser-based inference gives users more control over their photos, while open models and tools make experimentation, inspection, and future improvements more accessible.

WhisperTrail's goal is simple: **let technology help people notice the world, then encourage them to put their screens away.**

## 📌 Project

Built for the Hacktoberfest 2026 Open-Source AI Challenge — Week 1: Touch Grass.
