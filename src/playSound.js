export function playSound(name, volume = 1) {
    if (localStorage.getItem("sound") === "off") return;

    const ext = (name === "dice" || name === "move") ?"mp4" : "mp3";
    const audio = new Audio(`/sounds/${name}.${ext}`);
    audio.volume = volume;
    audio.play().catch(() => {});
}