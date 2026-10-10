
import { pipeline } from "@huggingface/transformers";

// =====================================
// WHISPERTRAIL — FINAL SCRIPT
// =====================================

let imageToText = null;
let db = null;
let aiReady = false;

const DB_NAME = "WhisperTrailDB";
const DB_VERSION = 1;
const STORE_NAME = "moments";

// =====================================
// ELEMENTS
// =====================================

const $ = (id) => document.getElementById(id);

const home = $("home");
const journalScreen = $("journalScreen");
const walk = $("walk");
const moment = $("moment");
const memoryScreen = $("memoryScreen");
const finalScreen = $("finalScreen");

const startBtn = $("startBtn");
const journalBtn = $("journalBtn");
const journalBackBtn = $("journalBackBtn");
const captureBtn = $("captureBtn");
const backBtn = $("backBtn");
const anotherBtn = $("anotherBtn");
const finishBtn = $("finishBtn");
const newWalkBtn = $("newWalkBtn");

const photoInput = $("photoInput");
const photoPlaceholder = $("photoPlaceholder");
const preview = $("preview");
const observation = $("observation");
const saveBtn = $("saveBtn");
const memoryPhoto = $("memoryPhoto");
const memoryText = $("memoryText");
const trail = $("trail");
const savedJournal = $("savedJournal");
const walkPrompt = $("walkPrompt");

const trailSummary = $("trailSummary");
const trailCount = $("trailCount");

// Optional status element; add id="aiStatus" to HTML if desired.
const aiStatus = $("aiStatus");

// =====================================
// OUTDOOR PROMPTS
// =====================================

const prompts = [
    "Find a shadow that isn't yours.",
    "Notice a sound you usually ignore.",
    "Find something growing where you didn't expect it.",
    "Look for a tiny detail in a larger scene.",
    "Notice where sunlight meets a shadow.",
    "Find something that is slowly changing.",
    "Stop for ten seconds. What can you hear?",
    "Look up and notice something above eye level.",
    "Find something you would normally walk past.",
    "Notice a colour that stands out around you."
];

function getRandomPrompt() {
    const available = prompts.filter(
        (prompt) => prompt !== walkPrompt.textContent
    );

    const choices = available.length ? available : prompts;

    return choices[Math.floor(Math.random() * choices.length)];
}

// =====================================
// AI MODEL
// =====================================

async function loadAI() {
    setAIStatus("Preparing your local AI...");

    try {
        imageToText = await pipeline(
            "image-to-text",
            "Xenova/vit-gpt2-image-captioning"
        );

        aiReady = true;
        setAIStatus("Your field journal is ready.");
        console.log("WhisperTrail AI loaded.");
    } catch (error) {
        aiReady = false;
        setAIStatus("AI is unavailable. Your observations can still be saved.");
        console.error("AI model failed to load:", error);
    }
}

function setAIStatus(message) {
    if (aiStatus) {
        aiStatus.textContent = message;
    }
}

loadAI();

// =====================================
// INDEXEDDB
// Keep the existing database and store.
// =====================================

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, {
                    keyPath: "id"
                });
            }
        };

        request.onsuccess = () => {
            db = request.result;
            console.log("WhisperTrail database ready.");
            resolve(db);
        };

        request.onerror = () => reject(request.error);

        request.onblocked = () => {
            console.warn("Database upgrade is blocked by another tab.");
        };
    });
}

const databaseReady = openDatabase();

function saveMomentToDB(momentData) {
    return databaseReady.then(
        () => new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            transaction.objectStore(STORE_NAME).put(momentData);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        })
    );
}

function getAllMoments() {
    return databaseReady.then(
        () => new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readonly");
            const request = transaction.objectStore(STORE_NAME).getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        })
    );
}

// =====================================
// SCREEN NAVIGATION
// =====================================

const screens = [
    home,
    journalScreen,
    walk,
    moment,
    memoryScreen,
    finalScreen
].filter(Boolean);

function showScreen(screen) {
    screens.forEach((item) => item.classList.add("hidden"));
    screen.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// =====================================
// HOME AND WALK
// =====================================

startBtn.addEventListener("click", () => {
    walkPrompt.textContent = getRandomPrompt();
    showScreen(walk);
});

captureBtn.addEventListener("click", () => {
    resetMoment();
    showScreen(moment);
});

backBtn.addEventListener("click", () => showScreen(home));

anotherBtn.addEventListener("click", () => {
    resetMoment();
    walkPrompt.textContent = getRandomPrompt();
    showScreen(moment);
});

newWalkBtn.addEventListener("click", () => {
    resetMoment();
    walkPrompt.textContent = getRandomPrompt();

    // Intentionally do NOT delete saved moments.
    showScreen(home);
});

// =====================================
// PHOTO PREVIEW
// =====================================

let previewURL = null;

photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please choose an image file.");
        photoInput.value = "";
        return;
    }

    if (previewURL) URL.revokeObjectURL(previewURL);

    previewURL = URL.createObjectURL(file);

    const image = document.createElement("img");
    image.src = previewURL;
    image.alt = "Your selected outdoor moment";

    preview.replaceChildren(image);
    photoPlaceholder.style.display = "none";
});

// =====================================
// IMAGE COMPRESSION
// =====================================

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(new Error("Could not read image."));

        reader.onload = (event) => {
            const image = new Image();

            image.onerror = () => reject(new Error("Could not process image."));

            image.onload = () => {
                const maxSize = 1000;
                const scale = Math.min(
                    1,
                    maxSize / Math.max(image.width, image.height)
                );

                const canvas = document.createElement("canvas");
                canvas.width = Math.round(image.width * scale);
                canvas.height = Math.round(image.height * scale);

                const context = canvas.getContext("2d");

                if (!context) {
                    reject(new Error("Image canvas is unavailable."));
                    return;
                }

                context.drawImage(
                    image,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                resolve(canvas.toDataURL("image/jpeg", 0.72));
            };

            image.src = event.target.result;
        };

        reader.readAsDataURL(file);
    });
}

// =====================================
// MEMORY GENERATION
// Uses the open model's image caption
// plus the user's own observation.
// =====================================

function cleanText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .replace(/[.!?]+$/g, "")
        .trim();
}

function createMemory(observationText, caption) {
    const observationTextClean = cleanText(observationText);
    const captionClean = cleanText(caption);

    if (!captionClean) {
        return `You paused to notice ${observationTextClean}. A small part of the day, kept in your field journal.`;
    }

    const lowerObservation = observationTextClean.charAt(0).toLowerCase()
        + observationTextClean.slice(1);

    const lowerCaption = captionClean.charAt(0).toLowerCase()
        + captionClean.slice(1);

    const templates = [
        `You paused to notice ${lowerObservation}. Around you, ${lowerCaption} became part of a moment worth keeping.`,
        `Somewhere between one step and the next, you noticed ${lowerObservation}. You will remember ${lowerCaption}.`,
        `The walk slowed for a moment: ${lowerObservation}. It was a small detail, but it made this walk yours.`,
        `You might have walked straight past it. Instead, you noticed ${lowerObservation}. Nearby, ${lowerCaption} completed the scene.`,
        `For a moment, your attention settled on ${lowerObservation}. ${capitalizeFirst(lowerCaption)} became part of your day outdoors.`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
}

function capitalizeFirst(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// =====================================
// SAVE MOMENT
// =====================================

saveBtn.addEventListener("click", async () => {
    const file = photoInput.files[0];
    const userObservation = observation.value.trim();

    if (!file) {
        alert("Please add a photo first.");
        return;
    }

    if (!userObservation) {
        alert("Tell us what you noticed.");
        observation.focus();
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Keeping your memory...";

    let imageData;

    try {
        imageData = await compressImage(file);

        let caption = "";

        if (aiReady && imageToText) {
            setAIStatus("Looking closely at your moment...");

            const imageURL = URL.createObjectURL(file);

            try {
                const result = await imageToText(imageURL);
                caption = result?.[0]?.generated_text || "";
            } catch (error) {
                console.error("Image caption failed:", error);
            } finally {
                URL.revokeObjectURL(imageURL);
            }
        }

        // If AI is unavailable, still preserve the user's observation.
        const memory = createMemory(
            userObservation,
            caption || "the world around you"
        );

        const momentData = {
            id: Date.now(),
            image: imageData,
            observation: userObservation,
            caption: caption || "AI caption unavailable",
            memory,
            date: new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
            })
        };

        await saveMomentToDB(momentData);

        showMemory(momentData);
        setAIStatus(aiReady
            ? "Your moment has been remembered."
            : "Your observation was saved without an AI caption."
        );
    } catch (error) {
        console.error("Could not save moment:", error);
        alert("We couldn't save this moment. Please try again.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML =
            '<span>Remember this moment</span><span class="arrow">↗</span>';
    }
});

// =====================================
// SHOW MEMORY
// =====================================

function showMemory(data) {
    const image = document.createElement("img");
    image.src = data.image;
    image.alt = "Your captured moment";

    memoryPhoto.replaceChildren(image);
    memoryText.textContent = data.memory;

    showScreen(memoryScreen);
}

// =====================================
// FINAL WALK STORY
// Generated from actual saved observations.
// No claim of text-generating AI.
// =====================================

function createWalkStory(moments) {
    const observations = moments
        .map((item) => cleanText(item.observation))
        .filter(Boolean);

    if (observations.length === 0) {
        return "Every walk begins with a little attention. Your next memory is waiting outside.";
    }

    if (observations.length === 1) {
        return `This walk gave you a moment to notice ${observations[0].charAt(0).toLowerCase() + observations[0].slice(1)}. Sometimes one small detail is enough to make a day feel different.`;
    }

    const first = observations[0].charAt(0).toLowerCase()
        + observations[0].slice(1);

    const last = observations[observations.length - 1]
        .charAt(0).toLowerCase()
        + observations[observations.length - 1].slice(1);

    return `Your walk became a collection of small details. You noticed ${first}, and along the way you also noticed ${last}. ${observations.length} moments that might otherwise have passed by, now kept here for you to remember.`;
}

async function buildFinalTrail() {
    trail.replaceChildren();

    const moments = await getAllMoments();
    moments.sort((a, b) => a.id - b.id);

    if (moments.length === 0) {
        if (trailCount) trailCount.textContent = "";
        if (trailSummary) {
            trailSummary.textContent =
                "Your walk is waiting for its first memory.";
        }

        const message = document.createElement("p");
        message.className = "trail-memory";
        message.textContent = "Go outside, notice something, and keep it here.";
        trail.appendChild(message);
        return;
    }

    if (trailCount) {
        trailCount.textContent =
            `${moments.length} moment${moments.length === 1 ? "" : "s"} remembered`;
    }

    if (trailSummary) {
        trailSummary.textContent = createWalkStory(moments);
    }

    moments.forEach((item, index) => {
        trail.appendChild(createMomentCard(item, index));
    });
}

function createMomentCard(item, index) {
    const card = document.createElement("article");
    card.className = "trail-card";

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = `Outdoor memory ${index + 1}`;
    image.loading = "lazy";

    const info = document.createElement("div");
    info.className = "trail-info";

    const number = document.createElement("p");
    number.className = "moment-number";
    number.textContent = `MOMENT ${String(index + 1).padStart(2, "0")}`;

    const memory = document.createElement("p");
    memory.className = "trail-memory";
    memory.textContent = item.memory;

    info.append(number, memory);

    if (item.date) {
        const date = document.createElement("p");
        date.className = "memory-meta";
        date.textContent = item.date;
        info.appendChild(date);
    }

    card.append(image, info);
    return card;
}

// =====================================
// FINISH WALK
// =====================================

finishBtn.addEventListener("click", async () => {
    finishBtn.disabled = true;

    try {
        await buildFinalTrail();
        showScreen(finalScreen);
    } catch (error) {
        console.error("Could not build final walk:", error);
        alert("We couldn't load your walk. Your saved moments have not been deleted.");
    } finally {
        finishBtn.disabled = false;
    }
});

// =====================================
// FIELD JOURNAL
// =====================================

async function buildSavedJournal() {
    savedJournal.replaceChildren();

    const moments = await getAllMoments();
    moments.sort((a, b) => a.id - b.id);

    if (moments.length === 0) {
        const message = document.createElement("p");
        message.className = "final-intro";
        message.textContent =
            "You haven't saved a moment yet. Go outside and find something worth remembering.";
        savedJournal.appendChild(message);
        return;
    }

    moments.forEach((item, index) => {
        savedJournal.appendChild(createMomentCard(item, index));
    });
}

journalBtn.addEventListener("click", async () => {
    journalBtn.disabled = true;

    try {
        await buildSavedJournal();
        showScreen(journalScreen);
    } catch (error) {
        console.error("Could not load Field Journal:", error);
        alert("Could not load your Field Journal. Please try again.");
    } finally {
        journalBtn.disabled = false;
    }
});

journalBackBtn.addEventListener("click", () => showScreen(home));

// =====================================
// RESET FORM
// =====================================

function resetMoment() {
    photoInput.value = "";
    observation.value = "";
    preview.replaceChildren();
    photoPlaceholder.style.display = "flex";

    if (previewURL) {
        URL.revokeObjectURL(previewURL);
        previewURL = null;
    }
}
