"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitContact } from "@/app/(site)/contact/actions";
import type { ContactState } from "@/lib/validation/contact";
import { services } from "@/lib/content";

const initialState: ContactState = { status: "idle" };

const fieldBase =
  "w-full rounded-[11px] border bg-[#fcfbff] px-4 py-[15px] text-base leading-normal outline-none transition placeholder:text-muted/70 focus:border-violet-400 focus:ring-[3px] focus:ring-violet-100";
const labelBase = "mb-[7px] block text-sm font-bold";

function fieldClass(hasError: boolean) {
  return `${fieldBase} ${hasError ? "border-red-400" : "border-line"}`;
}

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContact,
    initialState,
  );
  // Timestamp is captured on mount, not in the server render, so the
  // min-fill-time check measures real human typing time.
  const [startedAt] = useState(() => Date.now());
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      successRef.current?.focus();
    }
  }, [state.status]);

  if (state.status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-[24px] border border-line bg-white p-7 outline-none"
      >
        <div
          aria-hidden="true"
          className="mb-4 grid size-12 place-items-center rounded-full bg-[#e8f8f0] text-2xl text-[#1f9d63]"
        >
          ✓
        </div>
        <h2 className="mb-2 text-xl tracking-[-0.03em]">Message received</h2>
        <p className="text-[15px] leading-[1.7] text-muted">{state.message}</p>
      </div>
    );
  }

  const errors = state.errors ?? {};
  const values = state.values ?? {};

  return (
    <form
      action={formAction}
      noValidate
      className="rounded-[24px] border border-line bg-white p-6 sm:p-7"
    >
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
        </div>
      ) : null}

      <div className="mb-4">
        <label htmlFor="name" className={labelBase}>
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          defaultValue={values.name}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={fieldClass(Boolean(errors.name))}
          placeholder="Name"
        />
        {errors.name ? (
          <p id="name-error" className="mt-1.5 text-sm text-red-700">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="mb-4">
        <label htmlFor="email" className={labelBase}>
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={values.email}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={fieldClass(Boolean(errors.email))}
          placeholder="you@example.com"
        />
        {errors.email ? (
          <p id="email-error" className="mt-1.5 text-sm text-red-700">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className="mb-4">
        <label htmlFor="service" className={labelBase}>
          What do you need?{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <select
          id="service"
          name="service"
          defaultValue={values.service}
          className={fieldClass(false)}
        >
          <option value="">Select a service</option>
          {services.map((service) => (
            <option key={service.slug} value={service.title}>
              {service.title}
            </option>
          ))}
          <option value="Something else">Something else</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="message" className={labelBase}>
          Tell me about your project
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          defaultValue={values.message}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "message-error" : undefined}
          className={`${fieldClass(Boolean(errors.message))} min-h-[110px] resize-y`}
          placeholder="A few details about what you need…"
        />
        {errors.message ? (
          <p id="message-error" className="mt-1.5 text-sm text-red-700">
            {errors.message}
          </p>
        ) : null}
      </div>

      {/* Honeypot — visually hidden and hidden from assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <input type="hidden" name="startedAt" value={startedAt} />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-[13px] bg-violet-950 px-5 py-4 text-[15px] font-bold text-white transition duration-200 hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
        {pending ? null : <span aria-hidden="true">↗</span>}
      </button>

      <p className="mt-3 text-center text-xs leading-[1.6] text-muted">
        Your details are used only to reply to this enquiry.
      </p>
    </form>
  );
}
