const resumeCookieName = "home_charging_assessment_resume";
const resumeCookieDays = 30;

type ResumeCookiePayload = {
  assessmentId: string;
  resumeToken: string;
};

function encodeResumeCookiePayload(payload: ResumeCookiePayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeResumeCookiePayload(value: string): ResumeCookiePayload | null {
  try {
    const rawValue = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(rawValue) as Partial<ResumeCookiePayload>;

    if (
      typeof parsed.assessmentId === "string" &&
      typeof parsed.resumeToken === "string"
    ) {
      return {
        assessmentId: parsed.assessmentId,
        resumeToken: parsed.resumeToken,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function getAssessmentResumeCookieName() {
  return resumeCookieName;
}

export function createAssessmentResumeCookieValue(
  assessmentId: string,
  resumeToken: string,
) {
  return encodeResumeCookiePayload({ assessmentId, resumeToken });
}

export function readAssessmentResumeToken(
  cookieValue: string | undefined,
  assessmentId: string,
) {
  if (!cookieValue) {
    return null;
  }

  const payload = decodeResumeCookiePayload(cookieValue);

  if (payload?.assessmentId !== assessmentId) {
    return null;
  }

  return payload.resumeToken;
}

export function getAssessmentResumeCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(Date.now() + resumeCookieDays * 24 * 60 * 60 * 1000),
  };
}

export function getExpiredAssessmentResumeCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(0),
  };
}
