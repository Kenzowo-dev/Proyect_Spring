document.addEventListener("DOMContentLoaded", () => {
    const revealItems = document.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window)) {
        revealItems.forEach((item) => item.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
    );

    revealItems.forEach((item) => observer.observe(item));
});

(() => {
    const guest = document.querySelector("[data-session-guest]");
    const active = document.querySelector("[data-session-active]");
    const name = document.querySelector("[data-session-name]");
    const panel = document.querySelector("[data-session-panel]");
    if (!guest || !active || !name) return;

    let verification;
    async function verifySession() {
        verification?.abort();
        const request = new AbortController();
        verification = request;
        try {
            const response = await fetch("/api/session", {
                cache: "no-store",
                signal: request.signal,
            });
            const account = response.ok ? await response.json() : null;
            if (request.signal.aborted) return;
            name.textContent = account?.username ?? "";
            guest.hidden = Boolean(account);
            active.hidden = !account;
            if (panel) panel.hidden = !account;
        } catch {
            if (!request.signal.aborted) {
                name.textContent = "";
                guest.hidden = false;
                active.hidden = true;
                if (panel) panel.hidden = true;
            }
        }
    }

    window.addEventListener("pageshow", verifySession);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) verifySession();
    });
    if (typeof BroadcastChannel === "function") {
        const channel = new BroadcastChannel("panda-bobba-session");
        channel.addEventListener("message", event => {
            if (event.data === "changed") verifySession();
        });
    }
})();
