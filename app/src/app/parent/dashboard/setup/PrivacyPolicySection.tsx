import { CONSENT_VERSION, TC_SECTIONS } from "@/lib/legal/tc-content";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PrivacyPolicySection({
  earliestAcceptedAt,
  latestAcceptedVersion,
}: {
  earliestAcceptedAt: string | null;
  latestAcceptedVersion: string | null;
}) {
  const hasNewerVersion = latestAcceptedVersion !== null && latestAcceptedVersion !== CONSENT_VERSION;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-calm-green/20 bg-white px-4 py-3 text-sm">
        {earliestAcceptedAt ? (
          <p className="text-calm-text/70">
            You first accepted this on <span className="font-medium text-calm-text">{formatDate(earliestAcceptedAt)}</span>.
          </p>
        ) : (
          <p className="text-calm-text/70">No acceptance on record yet.</p>
        )}
        {hasNewerVersion && (
          <p className="mt-1 font-medium text-amber-700">
            A newer version of this notice is available and hasn&apos;t been accepted yet — you&apos;ll
            be asked to review it the next time it matters.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-calm-green/20 bg-calm-greenLight px-4 py-3 text-sm text-calm-text">
        <p className="font-medium text-calm-green">The two things parents ask about most:</p>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          <li>
            📷 Proof photos are automatically and permanently deleted the moment you review and rate
            a chore submission — never stored long-term or shown to anyone else.
          </li>
          <li>
            🧒 We never ask for or store a child&apos;s real/legal name — only a parent-chosen username
            (login only) and a child-chosen nickname (the only identifier shown anywhere in the app,
            including to friends).
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-calm-green/20 bg-white px-4 py-4">
        <p className="mb-3 text-xs font-medium text-calm-text/50">
          Calm Chore Terms and Conditions and Parental Consent Notice ({CONSENT_VERSION})
        </p>
        <div className="flex flex-col gap-4">
          {TC_SECTIONS.map((section) => (
            <div key={section.heading}>
              <p className="mb-1 text-sm font-semibold text-calm-green">{section.heading}</p>
              <div className="flex flex-col gap-1.5">
                {section.body.map((para, i) => (
                  <p key={i} className="text-sm text-calm-text/80">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
