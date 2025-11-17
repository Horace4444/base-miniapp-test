"use client";

import confetti from "canvas-confetti";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { DrawingCanvas, DrawingSeed } from "./DrawingCanvas";
import styles from "./page.module.css";

type ModalVariant = "invalid" | "win" | "lose";

const MODAL_COPY: Record<ModalVariant, { title: string; body: string; badge: string }> = {
  invalid: {
    title: "Sorry, I don’t think that was a C",
    body: "Give it another shot by starting in the top-right and swooping down to the bottom-right.",
    badge: "TRY AGAIN",
  },
  win: {
    title: "That’s a Winner!",
    body: "Please check your wallet for 1 × TOKEN.",
    badge: "WINNER",
  },
  lose: {
    title: "Ooof. Unlucky this time.",
    body: "You did not win a free TOKEN.",
    badge: "RESULT",
  },
};

export default function PlayPage() {
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const [modal, setModal] = useState<ModalVariant | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [isMiniAppReady, setMiniAppReady]);

  async function handleDrawingComplete(seed: DrawingSeed) {
    const didWin = await decideWin(seed);
    setModal(didWin ? "win" : "lose");
  }

  function handleInvalidDraw() {
    setModal("invalid");
  }

  return (
    <>
      <main className={styles.shell}>
        <div className={styles.stack}>
          <h1 className={styles.title}>Draw a C for your chance to win tokens.</h1>
          <button type="button" className={styles.backButton} onClick={() => router.push("/")}>
            ← Back to QR Code
          </button>
          <DrawingCanvas onComplete={handleDrawingComplete} onInvalid={handleInvalidDraw} />
        </div>
      </main>
      {modal && (
        <ResultModal
          variant={modal}
          title={MODAL_COPY[modal].title}
          body={MODAL_COPY[modal].body}
          badge={MODAL_COPY[modal].badge}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

async function decideWin(seed: DrawingSeed): Promise<boolean> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);

  const combined = new Uint8Array(seed.length + randomBytes.length);
  combined.set(seed, 0);
  combined.set(randomBytes, seed.length);

  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  const digest = new Uint8Array(hashBuffer);
  return (digest[0] & 1) === 0;
}

function ResultModal({
  variant,
  title,
  body,
  badge,
  onClose,
}: {
  variant: ModalVariant;
  title: string;
  body: string;
  badge: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (variant !== "win") return;
    if (typeof window === "undefined") return;

    const colors = ["#0052ff", "#00d4ff", "#7b7ff6", "#5c7cfa"];
    const duration = 1800;
    const end = Date.now() + duration;

    function frame() {
      confetti({
        particleCount: 6,
        startVelocity: 40,
        spread: 70,
        ticks: 260,
        origin: { x: Math.random() * 0.6 + 0.2, y: 0 },
        colors,
        gravity: 1.1,
        scalar: 0.9,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }

    frame();
  }, [variant]);

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={`card ${styles.modalCard}`}>
        <span className={styles.modalBadge}>{badge}</span>
        <h2 className={styles.modalTitle}>{title}</h2>
        <p className={styles.modalBody}>{body}</p>
        <button type="button" className="btn-primary" onClick={onClose}>
          {variant === "win" ? "Nice!" : "Got it"}
        </button>
      </div>
    </div>
  );
}

