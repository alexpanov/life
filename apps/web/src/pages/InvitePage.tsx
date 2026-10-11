import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { invitationUrl } from "../invitation";
export function InvitePage({ code }: { code: string }) {
  const [status, setStatus] = useState("");
  const url = invitationUrl(code);
  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "life",
          text: "Your world. Your next move. Come play life.",
          url,
        });
        setStatus("Invitation shared.");
        return;
      } catch (cause) {
        if (cause instanceof Error && cause.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Invitation link copied.");
    } catch {
      setStatus("Select and copy the link below.");
    }
  }
  return (
    <section className="focus-screen">
      <Link to="/nico" className="back-link">
        Back to Nico
      </Link>
      <h1>Share life.</h1>
      <p>Invite a friend to find their next quest.</p>
      <Button onClick={() => void share()}>Share invitation</Button>
      <label className="field invite-link">
        Your invitation link
        <input
          aria-label="Your invitation link"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      {status && <p role="status">{status}</p>}
      <details className="quiet-details">
        <summary>About referral rewards</summary>
        <p>Verified referral: 30 days of unlimited Nico energy.</p>
        <p>
          Phone verification is not connected yet. Sharing currently sends an
          invitation only; it does not unlock a reward.
        </p>
      </details>
    </section>
  );
}
