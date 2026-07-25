"use client";

import { TC_SECTIONS, CONSENT_CHECKBOX_TEXT } from "@/lib/legal/tc-content";

export default function TermsAndConditions({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="max-h-72 overflow-y-auto rounded-lg border border-calm-green/20 bg-white p-4 text-sm">
        <p className="mb-3 font-medium text-calm-green">
          Calm Chore — Terms &amp; Conditions and Parental Consent Notice
        </p>
        {TC_SECTIONS.map((section) => (
          <div key={section.heading} className="mb-3">
            <p className="font-medium">{section.heading}</p>
            {section.body.map((para, i) => (
              <p key={i} className="mt-1 text-calm-text/80">
                {para}
              </p>
            ))}
          </div>
        ))}
        <p className="mt-2 text-xs text-calm-text/50">
          Full legal text: “Calm Chore Terms and Conditions.docx”. Always available later
          under Setup → Privacy Policy.
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="consent"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>{CONSENT_CHECKBOX_TEXT}</span>
      </label>
    </div>
  );
}
