"use client";

import { useEffect, useState } from "react";

// Registra o service worker e avisa quando há uma nova versão do app pronta.
export function RegistrarServiceWorker() {
  const [novaVersao, setNovaVersao] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registro) => {
        registro.addEventListener("updatefound", () => {
          const instalando = registro.installing;
          instalando?.addEventListener("statechange", () => {
            if (instalando.state === "installed" && navigator.serviceWorker.controller) setNovaVersao(instalando);
          });
        });
      })
      .catch((erro: unknown) => console.error("Falha ao registrar o service worker", erro));

    let recarregando = false;
    const aoTrocar = () => {
      if (recarregando) return;
      recarregando = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", aoTrocar);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", aoTrocar);
  }, []);

  if (!novaVersao) return null;
  return (
    <div role="status" className="aviso" style={{ position: "fixed", left: 16, bottom: 16, zIndex: 30, margin: 0 }}>
      Nova versão do Portal disponível.{" "}
      <button type="button" className="botao" onClick={() => novaVersao.postMessage("ativar-nova-versao")}>
        Atualizar
      </button>
    </div>
  );
}
