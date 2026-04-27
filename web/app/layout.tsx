import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "foryu.me — find your ML twins on Hugging Face",
  description:
    "Type your Hugging Face handle. We rank everyone on HF by like-similarity to you, live in your browser. ~10 seconds, no backend.",
  openGraph: {
    title: "foryu.me — find your ML twins on Hugging Face",
    description:
      "Live two-hop graph expansion over HF likes, in your browser. Type your handle, get who to follow.",
    url: "https://foryu.me",
    siteName: "foryu.me",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "foryu.me — find your ML twins on Hugging Face",
    description:
      "Live two-hop graph expansion over HF likes, in your browser. Type your handle, get who to follow.",
    creator: "@bicro_",
  },
  metadataBase: new URL("https://foryu.me"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-50 text-zinc-950">
        <Script id="posthog-init" strategy="afterInteractive">
          {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="Ai Ri init Vi Yi Rr zi Gi Zi capture calculateEventProperties en register register_once register_for_session unregister unregister_for_session sn getFeatureFlag getFeatureFlagPayload getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync an identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty rn Ki createPersonProfile setInternalOrTestUser nn $i hn opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Xi debug Mr tn getPageViewId captureTraceFeedback captureTraceMetric Di".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init('phc_qypqFPC3awBCBYxDKtgJXThLUhRDw8sHGpcMpaUZNB2U', {
    api_host: 'https://us.i.posthog.com',
    defaults: '2026-01-30',
    person_profiles: 'identified_only',
})`}
        </Script>
        {children}
      </body>
    </html>
  );
}
