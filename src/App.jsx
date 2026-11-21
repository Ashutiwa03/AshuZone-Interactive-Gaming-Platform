import { useEffect, useRef, useState } from "react";
import { Routes, Route , useLocation } from "react-router-dom";

import Home from "./pages/Home";
import Chess from "./games/Chess";
import Ludo from "./games/Ludo";
import SnakeLadder from "./games/SnakeLadder";

function App() {
    const musicRef = useRef(null);
    const [soundOn, setSoundOn] = useState(
        () => localStorage.getItem("sound") !== "off"
    );
    const location = useLocation();
    const inGame = ["/ludo", "/snake-ladder", "/chess"].includes(location.pathname.toLowerCase());

    // Audio hai jo background music ke liye hai
    useEffect(() => {
        const music = new Audio("/sounds/ludobg.mp3");
        music.loop = true;
        music.volume = 0.25;
        musicRef.current = music;

        return () => {
            music.pause();
            music.currentTime = 0;
        };
    }, []);

    // ON/OFF handler
    useEffect(() => {
        const music = musicRef.current;
        if (!music) return;

        localStorage.setItem("sound", soundOn ? "on" : "off");

        if (!soundOn || inGame) {
            music.pause();
            return;
        }

        const startMusic = () => music.play().catch(() => {});
        startMusic();

        // Browser block kare to pehle click par shuru karo
        document.addEventListener("click", startMusic, { once: true });
        return () => document.removeEventListener("click", startMusic);
    }, [soundOn, inGame]);

    return (
        <>
            <button
                onClick={() => setSoundOn(!soundOn)}
                style={{
                    position: "fixed",
                    top: 16,
                    right: 16,
                    zIndex: 9999,
                    fontSize: 24,
                    padding: "8px 12px",
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                }}
            >
                {soundOn ? "🔊" : "🔇"}
            </button>

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/chess" element={<Chess />} />
                <Route path="/Ludo" element={<Ludo />} />
                <Route path="/Snake-ladder" element={<SnakeLadder />} />
            </Routes>
        </>
    );
}

export default App;