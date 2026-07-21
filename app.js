let clicks = 0;

const MELODY_GAIN = 0.40;
const DRUM_MASTER_GAIN = 1.70;
const KICK_GAIN = 0.30;
const KICK_ATTACK_GAIN = 0.05;
const SNARE_NOISE_GAIN = 0.15;
const SNARE_BODY_GAIN = 0.06;
const HI_HAT_ACCENT_GAIN = 0.05;
const HI_HAT_LIGHT_GAIN = 0.035;
const FINAL_KICK_GAIN = 0.42;
const CYMBAL_GAIN = 0.14;
const PHONE_CONFETTI_LIMIT = 110;
const DESKTOP_CONFETTI_LIMIT = 180;
const REDUCED_MOTION_CONFETTI_LIMIT = 36;

const kickPositions = new Set([1, 5, 8, 12, 15, 19, 22, 26, 29, 33, 36, 40]);
const snarePositions = new Set([3, 7, 10, 14, 17, 21, 24, 28, 31, 35, 38]);

const melody = [
    261.63, 261.63, 392.00, 392.00, 440.00, 440.00, 392.00,
    349.23, 349.23, 329.63, 329.63, 293.66, 293.66, 261.63,
    392.00, 392.00, 349.23, 349.23, 329.63, 329.63, 293.66,
    392.00, 392.00, 349.23, 349.23, 329.63, 329.63, 293.66,
    261.63, 261.63, 392.00, 392.00, 440.00, 440.00, 392.00,
    349.23, 349.23, 329.63, 329.63, 293.66, 293.66, 261.63
];

const lyrics = [
    ["Twin", "kle"], ["twin", "kle,"], ["lit", "tle"], ["star,"],
    ["How"], ["I"], ["won", "der"], ["what"], ["you"], ["are,"],
    ["Up"], ["a", "bove"], ["the"], ["world"], ["so"], ["high,"],
    ["Like"], ["a"], ["dia", "mond"], ["in"], ["the"], ["sky,"],
    ["Twin", "kle"], ["twin", "kle,"], ["lit", "tle"], ["star,"],
    ["How"], ["I"], ["won", "der"], ["what"], ["you"], ["are."]
];

const syllables = lyrics.flatMap((word, wordIndex) =>
    word.map((syllable, syllableIndex) => ({ wordIndex, syllableIndex }))
);

let melodyPosition = 0;
let shownWordIndex = -1;
let endingSong = false;
let audioContext;
let harmonyPurchased = false;
let completionBonusPurchased = false;
let rhythmDrumsPurchased = false;
let starFriendPurchased = false;
let completionBonusAwardedForCurrentSong = false;
let completionBonusMessageTimeout;
let choirEffects;
let drumEffects;
let starAnimationToken = 0;
let starWrapperAnimation;
let starAnimationFallbackTimeout;
let starFlightTimeout;
let lastStarWordIndex = -1;
let lastValidStarPosition;
let starViewportUpdateFrame;
let hiddenJewelRunArmed = false;
let hiddenJewelRevealPending = false;
let hiddenJewelRevealed = false;
let hiddenJewelDiscovered = false;
let hiddenJewelRevealTimeout;
let hiddenJewelAnimationFrame;
let hiddenJewelCelebrationElement;
let hiddenJewelCrownPositionFrame;
let hiddenJewelCelebrationStartedAt = 0;
let hiddenJewelCelebrationSettled = false;
let hiddenJewelConfetti = [];
let cheerNoiseBuffer;
let cheerNoiseAudio;

async function getAudioContext() {
    if (!audioContext || audioContext.state === "closed") {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContextClass();
    }
    if (audioContext.state !== "running") {
        await audioContext.resume();
    }
    return audioContext;
}

function removeSyllableEmphasis(lyricsBox) {
    lyricsBox.querySelectorAll("strong").forEach((syllable) => {
        const plainSyllable = document.createElement("span");
        plainSyllable.textContent = syllable.textContent;
        syllable.replaceWith(plainSyllable);
    });
}

function updateClicksAndShop() {
    document.getElementById("click-counter").textContent = `Clicks: ${clicks}`;
    const harmonyButton = document.getElementById("purchase-harmony");
    const completionBonusButton = document.getElementById("purchase-completion-bonus");
    const rhythmDrumsButton = document.getElementById("purchase-rhythm-drums");
    const starFriendButton = document.getElementById("purchase-star-friend");
    const hiddenJewelButton = document.getElementById("reveal-hidden-jewel");
    harmonyButton.disabled = harmonyPurchased || clicks < 30;
    harmonyButton.textContent = harmonyPurchased ? "Purchased" : "Purchase";
    completionBonusButton.disabled = completionBonusPurchased || clicks < 50;
    completionBonusButton.textContent = completionBonusPurchased ? "Purchased" : "Purchase";
    rhythmDrumsButton.disabled = rhythmDrumsPurchased || clicks < 90;
    rhythmDrumsButton.textContent = rhythmDrumsPurchased ? "Purchased" : "Purchase";
    starFriendButton.disabled = starFriendPurchased || clicks < 130;
    starFriendButton.textContent = starFriendPurchased ? "Purchased" : "Purchase";
    hiddenJewelButton.disabled = hiddenJewelDiscovered;
    hiddenJewelButton.textContent = hiddenJewelDiscovered ? "Discovered!" : "Reveal";
}

function allUpgradesPurchased() {
    return (
        harmonyPurchased &&
        completionBonusPurchased &&
        rhythmDrumsPurchased &&
        starFriendPurchased
    );
}

function purchaseHarmony() {
    if (harmonyPurchased || clicks < 30) {
        return;
    }

    clicks -= 30;
    harmonyPurchased = true;
    updateClicksAndShop();
}

function purchaseCompletionBonus() {
    if (completionBonusPurchased || clicks < 50) {
        return;
    }

    clicks -= 50;
    completionBonusPurchased = true;
    updateClicksAndShop();
}

function purchaseRhythmDrums() {
    if (rhythmDrumsPurchased || clicks < 90) {
        return;
    }

    clicks -= 90;
    rhythmDrumsPurchased = true;
    updateClicksAndShop();
}

function purchaseStarFriend() {
    if (starFriendPurchased || clicks < 130) {
        return;
    }

    clicks -= 130;
    starFriendPurchased = true;
    const star = document.getElementById("star-friend");
    star.hidden = false;
    document.getElementById("all-upgrades-message").hidden = false;
    star.classList.add("star-no-transition");
    positionStarFriend(null, false, false);
    void star.offsetWidth;
    star.classList.remove("star-no-transition");
    updateClicksAndShop();
}

function revealHiddenJewelEntry() {
    if (!hiddenJewelRevealPending || hiddenJewelRevealed) {
        return;
    }

    hiddenJewelRevealPending = false;
    hiddenJewelRevealed = true;
    hiddenJewelRevealTimeout = undefined;
    document.getElementById("hidden-jewel-upgrade").hidden = false;
    document.getElementById("secret-reward-status").textContent =
        "A secret shop reward has appeared: Hidden Jewel!";
    updateClicksAndShop();
}

function rectanglesIntersect(first, second) {
    return (
        first.left < second.right &&
        first.right > second.left &&
        first.top < second.bottom &&
        first.bottom > second.top
    );
}

function expandRectangle(rectangle, padding) {
    return {
        left: rectangle.left - padding,
        right: rectangle.right + padding,
        top: rectangle.top - padding,
        bottom: rectangle.bottom + padding
    };
}

function getLyricsBounds() {
    const words = [...document.querySelectorAll("#lyrics .lyric-word")];
    if (words.length === 0) {
        return document.getElementById("lyrics").getBoundingClientRect();
    }

    const rectangles = words.map((word) => word.getBoundingClientRect());
    return {
        left: Math.min(...rectangles.map((rectangle) => rectangle.left)),
        right: Math.max(...rectangles.map((rectangle) => rectangle.right)),
        top: Math.min(...rectangles.map((rectangle) => rectangle.top)),
        bottom: Math.max(...rectangles.map((rectangle) => rectangle.bottom))
    };
}

function getStarProtectedRectangles(activeWord) {
    const protectedElements = [
        document.getElementById("shop"),
        document.getElementById("click-status"),
        document.getElementById("music-button"),
        document.querySelector("body > h1"),
        document.querySelector("body > h1 + p"),
        ...document.querySelectorAll("#lyrics .lyric-word")
    ];

    return protectedElements
        .filter((element) => element && element !== activeWord)
        .map((element) => element.getBoundingClientRect())
        .filter((rectangle) =>
            rectangle.width > 0 &&
            rectangle.height > 0 &&
            rectangle.right > 0 &&
            rectangle.bottom > 0 &&
            rectangle.left < window.innerWidth &&
            rectangle.top < window.innerHeight
        )
        .map((rectangle) => expandRectangle(rectangle, 12));
}

function findSafeStarPosition(anchor, finalNote, activeWord) {
    const star = document.getElementById("star-friend");
    const width = star.offsetWidth;
    const height = star.offsetHeight;
    const margin = 24;
    const gap = 14;
    const maximumLeft = Math.max(margin, window.innerWidth - width - margin);
    const maximumTop = Math.max(margin, window.innerHeight - height - margin);
    const protectedRectangles = getStarProtectedRectangles(activeWord);
    const clampPosition = (position) => ({
        left: Math.min(Math.max(position.left, margin), maximumLeft),
        top: Math.min(Math.max(position.top, margin), maximumTop)
    });
    const isSafe = (position) => {
        const rectangle = {
            left: position.left,
            right: position.left + width,
            top: position.top,
            bottom: position.top + height
        };
        return protectedRectangles.every((protectedRectangle) =>
            !rectanglesIntersect(rectangle, protectedRectangle)
        );
    };
    const centerX = (anchor.left + anchor.right) / 2;
    const centerY = (anchor.top + anchor.bottom) / 2;
    const candidates = finalNote
        ? [
            { left: centerX - width / 2, top: centerY - height - gap },
            { left: centerX - width / 2, top: anchor.top - height - gap },
            { left: anchor.right + gap, top: centerY - height / 2 },
            { left: anchor.left - width - gap, top: centerY - height / 2 },
            { left: centerX - width / 2, top: anchor.bottom + gap }
        ]
        : [
            { left: centerX - width / 2, top: anchor.top - height - gap },
            { left: anchor.right + gap, top: centerY - height / 2 },
            { left: anchor.left - width - gap, top: centerY - height / 2 },
            { left: centerX - width / 2, top: anchor.bottom + gap },
            { left: anchor.right + gap, top: anchor.top - height - gap },
            { left: anchor.left - width - gap, top: anchor.top - height - gap }
        ];

    for (const candidate of candidates) {
        const clampedCandidate = clampPosition(candidate);
        if (isSafe(clampedCandidate)) {
            return clampedCandidate;
        }
    }

    const preferred = clampPosition(candidates[0]);
    let bestPosition;
    let bestDistance = Infinity;
    for (let top = margin; top <= maximumTop; top += 10) {
        for (let left = margin; left <= maximumLeft; left += 10) {
            const position = { left, top };
            if (!isSafe(position)) {
                continue;
            }
            const distance = (left - preferred.left) ** 2 + (top - preferred.top) ** 2;
            if (distance < bestDistance) {
                bestDistance = distance;
                bestPosition = position;
            }
        }
    }

    if (bestPosition) {
        return bestPosition;
    }

    return null;
}

function positionStarFriend(activeWord, finalNote, fly = true) {
    const star = document.getElementById("star-friend");
    const anchor = finalNote
        ? getLyricsBounds()
            : activeWord
            ? activeWord.getBoundingClientRect()
            : getLyricsBounds();
    if (
        !anchor ||
        !Number.isFinite(anchor.left) ||
        !Number.isFinite(anchor.right) ||
        !Number.isFinite(anchor.top) ||
        !Number.isFinite(anchor.bottom) ||
        anchor.right <= anchor.left ||
        anchor.bottom <= anchor.top ||
        anchor.width <= 0 ||
        anchor.height <= 0
    ) {
        return false;
    }
    const position = findSafeStarPosition(anchor, finalNote, activeWord);
    if (
        !position ||
        !Number.isFinite(position.left) ||
        !Number.isFinite(position.top)
    ) {
        return false;
    }
    star.style.left = `${position.left}px`;
    star.style.top = `${position.top}px`;
    lastValidStarPosition = position;
    return true;
}

function keepStarInsideViewport() {
    if (!starFriendPurchased || starViewportUpdateFrame) {
        return;
    }

    starViewportUpdateFrame = requestAnimationFrame(() => {
        starViewportUpdateFrame = undefined;
        const star = document.getElementById("star-friend");
        const activeWord = document.querySelector("#lyrics .current-word");
        star.classList.add("star-no-transition");
        if (positionStarFriend(activeWord, endingSong, false) === false && lastValidStarPosition) {
            star.style.left = `${lastValidStarPosition.left}px`;
            star.style.top = `${lastValidStarPosition.top}px`;
        }
        void star.offsetWidth;
        star.classList.remove("star-no-transition");
    });
}

function trackStarAnimation(star, animationName, activeClass, token, attempt = 0) {
    const animation = star.getAnimations().find((candidate) =>
        candidate.effect &&
        candidate.effect.target === star &&
        candidate.animationName === animationName
    );

    if (!animation) {
        if (attempt === 0) {
            requestAnimationFrame(() => {
                if (token === starAnimationToken) {
                    trackStarAnimation(star, animationName, activeClass, token, 1);
                }
            });
        }
        return;
    }

    starWrapperAnimation = animation;
    animation.finished.then(() => {
        if (
            token !== starAnimationToken ||
            starWrapperAnimation !== animation ||
            animation.animationName !== animationName
        ) {
            return;
        }

        clearTimeout(starAnimationFallbackTimeout);
        star.classList.remove(activeClass);
        starWrapperAnimation = undefined;
    }).catch(() => {});
}

function startStarAnimation(finalNote, token) {
    const star = document.getElementById("star-friend");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const activeClass = finalNote ? "star-finale" : "star-dance";
    const animationName = finalNote
        ? (reducedMotion ? "star-friend-finale-reduced" : "star-friend-finale")
        : (reducedMotion ? "star-friend-dance-reduced" : "star-friend-dance");
    const duration = finalNote
        ? (reducedMotion ? 450 : 720)
        : (reducedMotion ? 220 : 380);

    clearTimeout(starAnimationFallbackTimeout);
    if (starWrapperAnimation) {
        starWrapperAnimation.cancel();
        starWrapperAnimation = undefined;
    }
    star.classList.remove("star-dance", "star-finale");
    void star.offsetWidth;
    star.classList.add(activeClass);

    starAnimationFallbackTimeout = setTimeout(() => {
        if (token === starAnimationToken) {
            star.classList.remove(activeClass);
            starWrapperAnimation = undefined;
        }
    }, duration + 100);
    trackStarAnimation(star, animationName, activeClass, token);
}

function animateStarFriend(activeWord, finalNote) {
    const star = document.getElementById("star-friend");
    if (!activeWord || !activeWord.isConnected) {
        startStarAnimation(finalNote, ++starAnimationToken);
        return;
    }
    const wordRectangle = activeWord.getBoundingClientRect();
    if (
        wordRectangle.width <= 0 ||
        wordRectangle.height <= 0 ||
        !Number.isFinite(wordRectangle.left) ||
        !Number.isFinite(wordRectangle.top) ||
        !Number.isFinite(wordRectangle.right) ||
        !Number.isFinite(wordRectangle.bottom) ||
        wordRectangle.right <= wordRectangle.left ||
        wordRectangle.bottom <= wordRectangle.top
    ) {
        startStarAnimation(finalNote, ++starAnimationToken);
        return;
    }
    const wordIndex = Number(activeWord.dataset.wordIndex);
    const sameWord = !finalNote && wordIndex === lastStarWordIndex;
    const token = ++starAnimationToken;

    clearTimeout(starFlightTimeout);
    clearTimeout(starAnimationFallbackTimeout);
    if (starWrapperAnimation) {
        starWrapperAnimation.cancel();
        starWrapperAnimation = undefined;
    }
    star.classList.remove("star-dance", "star-finale", "star-flying");

    if (sameWord) {
        startStarAnimation(false, token);
        return;
    }

    if (!positionStarFriend(activeWord, finalNote)) {
        startStarAnimation(finalNote, token);
        return;
    }
    lastStarWordIndex = wordIndex;
    star.classList.add("star-flying");
    starFlightTimeout = setTimeout(() => {
        if (token !== starAnimationToken) {
            return;
        }
        star.classList.remove("star-flying");
        startStarAnimation(finalNote, token);
    }, finalNote ? 250 : 280);
}

function showCompletionBonusMessage() {
    const message = document.getElementById("completion-bonus-message");
    clearTimeout(completionBonusMessageTimeout);
    message.classList.remove("show");
    message.textContent = "+30 Song Completion Bonus! ⭐";
    void message.offsetWidth;
    message.classList.add("show");
    completionBonusMessageTimeout = setTimeout(() => {
        message.classList.remove("show");
    }, 2200);
}

function awardSongCompletionBonus() {
    if (!completionBonusPurchased || completionBonusAwardedForCurrentSong) {
        return;
    }

    completionBonusAwardedForCurrentSong = true;
    clicks += 30;
    updateClicksAndShop();
    showCompletionBonusMessage();
}

function getHiddenJewelProtectedRectangles() {
    const elements = [
        document.getElementById("shop"),
        document.getElementById("click-status"),
        document.getElementById("music-button"),
        document.querySelector("body > h1"),
        document.querySelector("body > h1 + p"),
        ...document.querySelectorAll("#lyrics .lyric-word")
    ];

    return elements
        .map((element) => element.getBoundingClientRect())
        .filter((rectangle) =>
            rectangle.width > 0 &&
            rectangle.height > 0 &&
            rectangle.right > 0 &&
            rectangle.bottom > 0 &&
            rectangle.left < window.innerWidth &&
            rectangle.top < window.innerHeight
        )
        .map((rectangle) => expandRectangle(rectangle, 14));
}

function positionHiddenJewelCrown() {
    if (!hiddenJewelCelebrationElement) {
        return;
    }

    const crown = hiddenJewelCelebrationElement.querySelector(".hidden-jewel-crown");
    const protectedRectangles = getHiddenJewelProtectedRectangles();
    const margin = 18;
    crown.style.width = "";

    for (let sizeAttempt = 0; sizeAttempt < 4; sizeAttempt += 1) {
        const width = crown.offsetWidth;
        const height = crown.offsetHeight;
        const maximumLeft = Math.max(margin, window.innerWidth - width - margin);
        const maximumTop = Math.max(margin, window.innerHeight - height - margin);
        const preferred = {
            left: Math.min(Math.max((window.innerWidth - width) / 2, margin), maximumLeft),
            top: margin
        };
        let bestPosition;
        let bestScore = Infinity;

        for (let top = margin; top <= maximumTop; top += 10) {
            for (let left = margin; left <= maximumLeft; left += 10) {
                const rectangle = {
                    left,
                    right: left + width,
                    top,
                    bottom: top + height
                };
                if (protectedRectangles.some((protectedRectangle) =>
                    rectanglesIntersect(rectangle, protectedRectangle)
                )) {
                    continue;
                }

                const horizontalDistance = left - preferred.left;
                const verticalDistance = top - preferred.top;
                const score = horizontalDistance ** 2 + verticalDistance ** 2 * 1.8;
                if (score < bestScore) {
                    bestScore = score;
                    bestPosition = { left, top };
                }
            }
        }

        if (bestPosition) {
            crown.style.left = `${bestPosition.left}px`;
            crown.style.top = `${bestPosition.top}px`;
            return;
        }

        const smallerWidth = Math.max(140, width * 0.82);
        crown.style.width = `${smallerWidth}px`;
    }
}

function scheduleHiddenJewelCrownPosition() {
    if (!hiddenJewelCelebrationElement || hiddenJewelCrownPositionFrame) {
        return;
    }

    hiddenJewelCrownPositionFrame = requestAnimationFrame(() => {
        hiddenJewelCrownPositionFrame = undefined;
        positionHiddenJewelCrown();
    });
}

function resizeHiddenJewelCanvas() {
    if (!hiddenJewelCelebrationElement) {
        return;
    }

    const canvas = hiddenJewelCelebrationElement.querySelector(".hidden-jewel-confetti");
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * pixelRatio);
    canvas.height = Math.round(window.innerHeight * pixelRatio);
    canvas.getContext("2d").setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function createHiddenJewelConfettiParticle(startAboveViewport = false) {
    const colors = ["#ffd84d", "#fff36b", "#f23b5d", "#287cff", "#28c87b", "#9f58ed", "#38d7e8"];
    return {
        x: Math.random() * window.innerWidth,
        y: startAboveViewport ? -20 - Math.random() * window.innerHeight : Math.random() * window.innerHeight,
        width: 5 + Math.random() * 8,
        height: 4 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 70 + Math.random() * 150,
        drift: -35 + Math.random() * 70,
        rotation: Math.random() * Math.PI * 2,
        spin: -4 + Math.random() * 8,
        shape: Math.floor(Math.random() * 3)
    };
}

function drawHiddenJewelParticle(context, particle) {
    context.save();
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation);
    context.fillStyle = particle.color;
    if (particle.shape === 1) {
        context.beginPath();
        context.arc(0, 0, particle.width / 2, 0, Math.PI * 2);
        context.fill();
    } else if (particle.shape === 2) {
        context.rotate(Math.PI / 4);
        context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
    } else {
        context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
    }
    context.restore();
}

function cleanupHiddenJewelCelebration() {
    if (hiddenJewelAnimationFrame) {
        cancelAnimationFrame(hiddenJewelAnimationFrame);
    }
    if (hiddenJewelCrownPositionFrame) {
        cancelAnimationFrame(hiddenJewelCrownPositionFrame);
    }
    window.removeEventListener("resize", handleHiddenJewelCelebrationResize);
    window.removeEventListener("orientationchange", handleHiddenJewelCelebrationResize);
    window.removeEventListener("scroll", scheduleHiddenJewelCrownPosition);
    if (hiddenJewelCelebrationElement) {
        const canvas = hiddenJewelCelebrationElement.querySelector(".hidden-jewel-confetti");
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        hiddenJewelCelebrationElement.remove();
    }
    hiddenJewelAnimationFrame = undefined;
    hiddenJewelCrownPositionFrame = undefined;
    hiddenJewelCelebrationElement = undefined;
    hiddenJewelCelebrationSettled = false;
    hiddenJewelConfetti = [];
}

function drawSettledHiddenJewelConfetti() {
    if (!hiddenJewelCelebrationElement) {
        return;
    }

    const canvas = hiddenJewelCelebrationElement.querySelector(".hidden-jewel-confetti");
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    hiddenJewelConfetti.forEach((particle) => {
        particle.x = ((particle.x % window.innerWidth) + window.innerWidth) % window.innerWidth;
        particle.y = ((particle.y % window.innerHeight) + window.innerHeight) % window.innerHeight;
        drawHiddenJewelParticle(context, particle);
    });
}

function handleHiddenJewelCelebrationResize() {
    resizeHiddenJewelCanvas();
    scheduleHiddenJewelCrownPosition();
    if (hiddenJewelCelebrationSettled) {
        drawSettledHiddenJewelConfetti();
    }
}

function startHiddenJewelCelebration() {
    cleanupHiddenJewelCelebration();
    const template = document.getElementById("hidden-jewel-celebration-template");
    const fragment = template.content.cloneNode(true);
    hiddenJewelCelebrationElement = fragment.querySelector(".hidden-jewel-celebration");
    document.body.appendChild(hiddenJewelCelebrationElement);
    resizeHiddenJewelCanvas();
    positionHiddenJewelCrown();
    window.addEventListener("resize", handleHiddenJewelCelebrationResize);
    window.addEventListener("orientationchange", handleHiddenJewelCelebrationResize);
    window.addEventListener("scroll", scheduleHiddenJewelCrownPosition, { passive: true });

    const canvas = hiddenJewelCelebrationElement.querySelector(".hidden-jewel-confetti");
    const context = canvas.getContext("2d");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    hiddenJewelCelebrationStartedAt = performance.now();
    hiddenJewelCelebrationSettled = reducedMotion;

    if (reducedMotion) {
        hiddenJewelConfetti = Array.from(
            { length: REDUCED_MOTION_CONFETTI_LIMIT },
            () => createHiddenJewelConfettiParticle()
        );
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        hiddenJewelConfetti.forEach((particle) => drawHiddenJewelParticle(context, particle));
    } else {
        const particleCount = window.innerWidth <= 800
            ? PHONE_CONFETTI_LIMIT
            : DESKTOP_CONFETTI_LIMIT;
        hiddenJewelConfetti = Array.from(
            { length: particleCount },
            () => createHiddenJewelConfettiParticle()
        );
        let previousTime = hiddenJewelCelebrationStartedAt;
        const animateConfetti = (currentTime) => {
            const elapsedSeconds = Math.min((currentTime - previousTime) / 1000, 0.05);
            previousTime = currentTime;
            context.clearRect(0, 0, window.innerWidth, window.innerHeight);
            hiddenJewelConfetti.forEach((particle) => {
                particle.x += particle.drift * elapsedSeconds;
                particle.y += particle.speed * elapsedSeconds;
                particle.rotation += particle.spin * elapsedSeconds;
                if (particle.y > window.innerHeight + 20) {
                    Object.assign(particle, createHiddenJewelConfettiParticle(true));
                }
                if (particle.x < -20) {
                    particle.x = window.innerWidth + 20;
                } else if (particle.x > window.innerWidth + 20) {
                    particle.x = -20;
                }
                drawHiddenJewelParticle(context, particle);
            });
            hiddenJewelAnimationFrame = requestAnimationFrame(animateConfetti);
        };
        hiddenJewelAnimationFrame = requestAnimationFrame(animateConfetti);
    }
}

function getCheerNoiseBuffer(audio) {
    if (cheerNoiseBuffer && cheerNoiseAudio === audio) {
        return cheerNoiseBuffer;
    }

    const duration = 2.2;
    cheerNoiseBuffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate);
    const data = cheerNoiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
        data[i] = Math.random() * 2 - 1;
    }
    cheerNoiseAudio = audio;
    return cheerNoiseBuffer;
}

function playCheering(audio) {
    const now = audio.currentTime;
    const noise = audio.createBufferSource();
    const noiseFilter = audio.createBiquadFilter();
    const noiseVolume = audio.createGain();
    const voiceMix = audio.createGain();
    const firstFormant = audio.createBiquadFilter();
    const secondFormant = audio.createBiquadFilter();
    const compressor = audio.createDynamicsCompressor();
    const master = audio.createGain();
    const voices = [];
    const voiceVolumes = [];

    noise.buffer = getCheerNoiseBuffer(audio);
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 1100;
    noiseFilter.Q.value = 0.55;
    noiseVolume.gain.setValueAtTime(0.0001, now);
    noiseVolume.gain.linearRampToValueAtTime(0.13, now + 0.08);
    noiseVolume.gain.setValueAtTime(0.11, now + 0.55);
    noiseVolume.gain.linearRampToValueAtTime(0.15, now + 0.85);
    noiseVolume.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    firstFormant.type = "bandpass";
    firstFormant.frequency.value = 850;
    firstFormant.Q.value = 0.8;
    secondFormant.type = "bandpass";
    secondFormant.frequency.value = 1450;
    secondFormant.Q.value = 0.7;
    compressor.threshold.value = -12;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.18;
    master.gain.value = 0.22;

    noise.connect(noiseFilter).connect(noiseVolume).connect(compressor);
    voiceMix.connect(firstFormant).connect(compressor);
    voiceMix.connect(secondFormant).connect(compressor);
    compressor.connect(master).connect(audio.destination);

    [360, 430, 510, 590, 680].forEach((frequency, index) => {
        const voice = audio.createOscillator();
        const volume = audio.createGain();
        const start = now + index * 0.055;
        voice.type = "triangle";
        voice.frequency.setValueAtTime(frequency, start);
        voice.frequency.exponentialRampToValueAtTime(frequency * 1.38, start + 0.62);
        volume.gain.setValueAtTime(0.0001, start);
        volume.gain.linearRampToValueAtTime(0.035, start + 0.06);
        volume.gain.setValueAtTime(0.025, start + 0.52);
        volume.gain.exponentialRampToValueAtTime(0.0001, start + 1.35);
        voice.connect(volume).connect(voiceMix);
        voice.start(start);
        voice.stop(start + 1.4);
        voices.push(voice);
        voiceVolumes.push(volume);
    });

    noise.start(now);
    noise.stop(now + 2.2);
    noise.onended = () => {
        noise.disconnect();
        noiseFilter.disconnect();
        noiseVolume.disconnect();
        voices.forEach((voice) => voice.disconnect());
        voiceVolumes.forEach((volume) => volume.disconnect());
        voiceMix.disconnect();
        firstFormant.disconnect();
        secondFormant.disconnect();
        compressor.disconnect();
        master.disconnect();
    };
}

async function discoverHiddenJewel() {
    if (!hiddenJewelRevealed || hiddenJewelDiscovered) {
        return;
    }

    hiddenJewelDiscovered = true;
    updateClicksAndShop();
    document.getElementById("secret-reward-status").textContent =
        "Hidden Jewel discovered! Royal celebration!";
    startHiddenJewelCelebration();
    const audio = await getAudioContext();
    playApplause(audio);
    playCheering(audio);
}

function playApplause(audio) {
    const duration = 1.2;
    const sampleRate = audio.sampleRate;
    const buffer = audio.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
        const fade = 1 - i / data.length;
        data[i] = (Math.random() * 2 - 1) * fade;
    }

    const noise = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.7;
    gain.gain.value = 0.35;
    noise.connect(filter).connect(gain).connect(audio.destination);
    noise.start();
}

function showCurrentSyllable() {
    const lyricsBox = document.getElementById("lyrics");
    const current = syllables[melodyPosition];

    removeSyllableEmphasis(lyricsBox);
    lyricsBox.querySelectorAll(".current-word").forEach((word) => {
        word.classList.remove("current-word");
    });

    if (current.wordIndex > shownWordIndex) {
        const word = document.createElement("span");
        word.className = "lyric-word";
        word.dataset.wordIndex = current.wordIndex;
        lyrics[current.wordIndex].forEach((text) => {
            const syllable = document.createElement("span");
            syllable.textContent = text;
            word.appendChild(syllable);
        });
        lyricsBox.appendChild(word);
        shownWordIndex = current.wordIndex;
    }

    const currentWord = lyricsBox.querySelector(`[data-word-index="${current.wordIndex}"]`);
    const currentSyllable = currentWord.children[current.syllableIndex];
    const emphasis = document.createElement("strong");
    emphasis.textContent = currentSyllable.textContent;
    currentSyllable.replaceWith(emphasis);
    void currentWord.offsetWidth;
    currentWord.classList.add("current-word");

    const progress = (current.wordIndex + 1) / lyrics.length;
    const minimumSize = window.matchMedia("(max-width: 800px)").matches ? 12 : 14;
    lyricsBox.style.fontSize = `clamp(${minimumSize}px, ${4 - progress * 1.8}vw, 38px)`;
    return currentWord;
}

function finishSong(audio) {
    const lyricsBox = document.getElementById("lyrics");
    const button = document.getElementById("music-button");
    const hiddenJewelQualified =
        hiddenJewelRunArmed &&
        allUpgradesPurchased() &&
        !hiddenJewelRevealPending &&
        !hiddenJewelRevealed;
    hiddenJewelRunArmed = false;
    if (hiddenJewelQualified) {
        hiddenJewelRevealPending = true;
    }
    endingSong = true;
    button.disabled = true;
    awardSongCompletionBonus();
    if (starFriendPurchased) {
        positionStarFriend(document.querySelector("#lyrics .current-word"), true);
    }
    removeSyllableEmphasis(lyricsBox);
    lyricsBox.querySelectorAll(".current-word").forEach((word) => {
        word.classList.remove("current-word");
    });
    lyricsBox.classList.add("final-bounce");

    setTimeout(() => {
        lyricsBox.replaceChildren();
        lyricsBox.classList.remove("final-bounce");
        const wellDone = document.getElementById("well-done");
        wellDone.classList.add("show");
        playApplause(audio);
        if (hiddenJewelRevealPending && !hiddenJewelRevealed) {
            clearTimeout(hiddenJewelRevealTimeout);
            hiddenJewelRevealTimeout = setTimeout(revealHiddenJewelEntry, 1200);
        }
        melodyPosition = 0;
        shownWordIndex = -1;
        completionBonusAwardedForCurrentSong = false;
        endingSong = false;
        button.disabled = false;
    }, 1000);
}

function getChoirEffects(audio) {
    if (choirEffects && choirEffects.audio === audio) {
        return choirEffects;
    }

    const input = audio.createGain();
    const body = audio.createGain();
    const firstFormant = audio.createBiquadFilter();
    const firstFormantVolume = audio.createGain();
    const secondFormant = audio.createBiquadFilter();
    const secondFormantVolume = audio.createGain();
    const tone = audio.createBiquadFilter();
    const compressor = audio.createDynamicsCompressor();
    const echo = audio.createDelay(1);
    const echoFilter = audio.createBiquadFilter();
    const echoFeedback = audio.createGain();
    const echoVolume = audio.createGain();

    body.gain.value = 0.55;
    firstFormant.type = "bandpass";
    firstFormant.frequency.value = 380;
    firstFormant.Q.value = 0.9;
    firstFormantVolume.gain.value = 0.9;
    secondFormant.type = "bandpass";
    secondFormant.frequency.value = 850;
    secondFormant.Q.value = 1.1;
    secondFormantVolume.gain.value = 0.6;
    tone.type = "lowpass";
    tone.frequency.value = 2200;
    tone.Q.value = 0.5;
    compressor.threshold.value = -16;
    compressor.knee.value = 10;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.18;
    echo.delayTime.value = 0.12;
    echoFilter.type = "lowpass";
    echoFilter.frequency.value = 1800;
    echoFeedback.gain.value = 0.11;
    echoVolume.gain.value = 0.16;

    input.connect(body).connect(tone);
    input.connect(firstFormant).connect(firstFormantVolume).connect(tone);
    input.connect(secondFormant).connect(secondFormantVolume).connect(tone);
    tone.connect(compressor).connect(audio.destination);
    compressor.connect(echo).connect(echoFilter).connect(echoVolume).connect(audio.destination);
    echoFilter.connect(echoFeedback).connect(echo);

    choirEffects = { audio, input };
    return choirEffects;
}

function playAngelicChoir(audio, frequency) {
    const effects = getChoirEffects(audio);
    const now = audio.currentTime;
    const noteVolume = audio.createGain();
    const vibrato = audio.createOscillator();
    const vibratoDepth = audio.createGain();
    const voices = [];
    const voiceVolumes = [];

    noteVolume.gain.setValueAtTime(0.0001, now);
    noteVolume.gain.linearRampToValueAtTime(0.18, now + 0.08);
    noteVolume.gain.setValueAtTime(0.18, now + 0.16);
    noteVolume.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    noteVolume.connect(effects.input);

    [-7, 0, 7].forEach((detune) => {
        const voice = audio.createOscillator();
        const voiceVolume = audio.createGain();
        voice.type = "triangle";
        voice.frequency.value = frequency;
        voice.detune.value = detune;
        voiceVolume.gain.value = 0.28;
        voice.connect(voiceVolume).connect(noteVolume);
        vibratoDepth.connect(voice.detune);
        voices.push(voice);
        voiceVolumes.push(voiceVolume);
    });

    const octaveVoice = audio.createOscillator();
    const octaveVolume = audio.createGain();
    octaveVoice.type = "sine";
    octaveVoice.frequency.value = frequency * 2;
    octaveVolume.gain.value = 0.12;
    octaveVoice.connect(octaveVolume).connect(noteVolume);
    vibratoDepth.connect(octaveVoice.detune);
    voices.push(octaveVoice);
    voiceVolumes.push(octaveVolume);

    vibrato.type = "sine";
    vibrato.frequency.value = 5;
    vibratoDepth.gain.value = 4;
    vibrato.connect(vibratoDepth);

    voices.forEach((voice) => {
        voice.start(now);
        voice.stop(now + 0.7);
    });
    vibrato.start(now);
    vibrato.stop(now + 0.7);

    voices[voices.length - 1].onended = () => {
        voices.forEach((voice) => voice.disconnect());
        voiceVolumes.forEach((voiceVolume) => voiceVolume.disconnect());
        vibrato.disconnect();
        vibratoDepth.disconnect();
        noteVolume.disconnect();
    };
}

function getDrumEffects(audio) {
    if (drumEffects && drumEffects.audio === audio) {
        return drumEffects;
    }

    const input = audio.createGain();
    const compressor = audio.createDynamicsCompressor();
    const master = audio.createGain();
    const noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const noise = noiseBuffer.getChannelData(0);

    for (let i = 0; i < noise.length; i += 1) {
        noise[i] = Math.random() * 2 - 1;
    }

    compressor.threshold.value = -18;
    compressor.knee.value = 10;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;
    master.gain.value = DRUM_MASTER_GAIN;

    input.connect(compressor).connect(master).connect(audio.destination);
    drumEffects = { audio, input, compressor, master, noiseBuffer };
    return drumEffects;
}

function playKick(audio, effects, finalKick = false) {
    const now = audio.currentTime;
    const duration = finalKick ? 0.28 : 0.2;
    const kick = audio.createOscillator();
    const kickVolume = audio.createGain();
    const attack = audio.createOscillator();
    const attackFilter = audio.createBiquadFilter();
    const attackVolume = audio.createGain();

    kick.type = "sine";
    kick.frequency.setValueAtTime(145, now);
    kick.frequency.exponentialRampToValueAtTime(55, now + 0.11);
    kickVolume.gain.setValueAtTime(0.0001, now);
    kickVolume.gain.linearRampToValueAtTime(finalKick ? FINAL_KICK_GAIN : KICK_GAIN, now + 0.004);
    kickVolume.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    attack.type = "triangle";
    attack.frequency.setValueAtTime(650, now);
    attack.frequency.exponentialRampToValueAtTime(280, now + 0.018);
    attackFilter.type = "lowpass";
    attackFilter.frequency.value = 1200;
    attackFilter.Q.value = 0.7;
    attackVolume.gain.setValueAtTime(0.0001, now);
    attackVolume.gain.linearRampToValueAtTime(KICK_ATTACK_GAIN, now + 0.004);
    attackVolume.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

    kick.connect(kickVolume).connect(effects.input);
    attack.connect(attackFilter).connect(attackVolume).connect(effects.input);
    kick.start(now);
    kick.stop(now + duration + 0.02);
    attack.start(now);
    attack.stop(now + 0.04);

    kick.onended = () => {
        kick.disconnect();
        kickVolume.disconnect();
        attack.disconnect();
        attackFilter.disconnect();
        attackVolume.disconnect();
    };
}

function playSnare(audio, effects) {
    const now = audio.currentTime;
    const noise = audio.createBufferSource();
    const noiseFilter = audio.createBiquadFilter();
    const noiseVolume = audio.createGain();
    const body = audio.createOscillator();
    const bodyVolume = audio.createGain();

    noise.buffer = effects.noiseBuffer;
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 1600;
    noiseFilter.Q.value = 0.7;
    noiseVolume.gain.setValueAtTime(SNARE_NOISE_GAIN, now);
    noiseVolume.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    body.type = "sine";
    body.frequency.value = 180;
    bodyVolume.gain.setValueAtTime(SNARE_BODY_GAIN, now);
    bodyVolume.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    noise.connect(noiseFilter).connect(noiseVolume).connect(effects.input);
    body.connect(bodyVolume).connect(effects.input);
    noise.start(now, Math.random() * 0.8);
    noise.stop(now + 0.16);
    body.start(now);
    body.stop(now + 0.13);

    noise.onended = () => {
        noise.disconnect();
        noiseFilter.disconnect();
        noiseVolume.disconnect();
        body.disconnect();
        bodyVolume.disconnect();
    };
}

function playHiHat(audio, effects, accented) {
    const now = audio.currentTime;
    const noise = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const volume = audio.createGain();

    noise.buffer = effects.noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = 6000;
    volume.gain.setValueAtTime(accented ? HI_HAT_ACCENT_GAIN : HI_HAT_LIGHT_GAIN, now);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    noise.connect(filter).connect(volume).connect(effects.input);
    noise.start(now, Math.random() * 0.9);
    noise.stop(now + 0.05);
    noise.onended = () => {
        noise.disconnect();
        filter.disconnect();
        volume.disconnect();
    };
}

function playCymbal(audio, effects) {
    const now = audio.currentTime;
    const noise = audio.createBufferSource();
    const noiseFilter = audio.createBiquadFilter();
    const noiseVolume = audio.createGain();
    const metallicFilter = audio.createBiquadFilter();
    const metallicVolume = audio.createGain();
    const metallicVoices = [410, 547, 731, 923].map((frequency) => {
        const voice = audio.createOscillator();
        voice.type = "square";
        voice.frequency.value = frequency;
        voice.connect(metallicFilter);
        return voice;
    });

    noise.buffer = effects.noiseBuffer;
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 3000;
    noiseVolume.gain.setValueAtTime(CYMBAL_GAIN * 0.7, now);
    noiseVolume.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    metallicFilter.type = "bandpass";
    metallicFilter.frequency.value = 5500;
    metallicFilter.Q.value = 0.7;
    metallicVolume.gain.setValueAtTime(CYMBAL_GAIN * 0.03, now);
    metallicVolume.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    noise.connect(noiseFilter).connect(noiseVolume).connect(effects.input);
    metallicFilter.connect(metallicVolume).connect(effects.input);
    noise.start(now, Math.random() * 0.3);
    noise.stop(now + 0.62);
    metallicVoices.forEach((voice) => {
        voice.start(now);
        voice.stop(now + 0.62);
    });

    noise.onended = () => {
        noise.disconnect();
        noiseFilter.disconnect();
        noiseVolume.disconnect();
        metallicVoices.forEach((voice) => voice.disconnect());
        metallicFilter.disconnect();
        metallicVolume.disconnect();
    };
}

function playRhythmDrums(audio, songPosition) {
    const effects = getDrumEffects(audio);
    const position = songPosition + 1;

    if (position === melody.length) {
        playKick(audio, effects, true);
        playCymbal(audio, effects);
        return;
    }

    const phrasePosition = songPosition % 7;
    playHiHat(audio, effects, phrasePosition % 2 === 0);

    if (kickPositions.has(position)) {
        playKick(audio, effects);
    }
    if (snarePositions.has(position)) {
        playSnare(audio, effects);
    }
}

async function launchGame() {
    if (endingSong) {
        return;
    }

    const button = document.getElementById("music-button");
    button.disabled = true;
    const audio = await getAudioContext();
    button.disabled = false;
    const sound = audio.createOscillator();
    const soundVolume = audio.createGain();

    document.getElementById("well-done").classList.remove("show");
    if (
        melodyPosition === 0 &&
        allUpgradesPurchased() &&
        !hiddenJewelRevealPending &&
        !hiddenJewelRevealed
    ) {
        hiddenJewelRunArmed = true;
    }
    const activeWord = showCurrentSyllable();
    scheduleHiddenJewelCrownPosition();

    soundVolume.gain.value = MELODY_GAIN;
    sound.connect(soundVolume).connect(audio.destination);
    sound.frequency.value = melody[melodyPosition];
    sound.start();
    sound.stop(audio.currentTime + 0.4);
    sound.onended = () => {
        sound.disconnect();
        soundVolume.disconnect();
    };

    if (harmonyPurchased) {
        playAngelicChoir(audio, melody[melodyPosition]);
    }
    if (rhythmDrumsPurchased) {
        playRhythmDrums(audio, melodyPosition);
    }
    if (starFriendPurchased) {
        animateStarFriend(activeWord, melodyPosition === melody.length - 1);
    }

    clicks += 1;
    updateClicksAndShop();

    if (melodyPosition === melody.length - 1) {
        finishSong(audio);
    } else {
        melodyPosition += 1;
    }
}

document.getElementById("purchase-rhythm-drums").addEventListener("click", purchaseRhythmDrums);
document.getElementById("purchase-star-friend").addEventListener("click", purchaseStarFriend);
document.getElementById("reveal-hidden-jewel").addEventListener("click", discoverHiddenJewel);
window.addEventListener("resize", keepStarInsideViewport);
window.addEventListener("scroll", keepStarInsideViewport, { passive: true });
