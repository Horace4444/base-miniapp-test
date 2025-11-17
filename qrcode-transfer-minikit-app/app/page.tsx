"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import styles from "./page.module.css";

const DEFAULT_MINI_APP_URL =
  (process.env.NEXT_PUBLIC_URL &&
    `${process.env.NEXT_PUBLIC_URL.replace(/\/$/, "")}/play`) ||
  "https://your-miniapp-url.vercel.app/play";

export default function Home() {
  const [miniAppUrl, setMiniAppUrl] = useState(DEFAULT_MINI_APP_URL);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMiniAppUrl(`${window.location.origin}/play`);
    }
  }, []);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(miniAppUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#0a0b0d", light: "#ffffff" },
    })
      .then((url) => {
        if (active) {
          setQrDataUrl(url);
        }
      })
      .catch(() => {
        if (active) {
          setQrDataUrl(null);
        }
      });
    return () => {
      active = false;
    };
  }, [miniAppUrl]);

  function handleSimulateScan() {
    router.push("/play");
  }

  return (
    <main className={styles.shell}>
      <div className={`card ${styles.card}`}>
        <h1 className={styles.title}>Token Lottery</h1>
        <span className={styles.label}>Scan to play</span>
        <div className={styles.qrFrame}>
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt="QR code that opens the C-draw Mini App"
              className={styles.qrImage}
              width={220}
              height={220}
              unoptimized
            />
          ) : (
            <div className={styles.qrSkeleton} aria-hidden="true" />
          )}
        </div>
        <button type="button" className={styles.button} onClick={handleSimulateScan}>
          Simulate QR Scan
        </button>
      </div>
    </main>
  );
}
