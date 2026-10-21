
/* =========================================================
   STUDENT SCHOLARSHIP MONITORING SYSTEM
   Supabase frontend and security tests S03-S08
   ========================================================= */

// 1. SUPABASE CONFIGURATION
const SUPABASE_URL = "https://covbfcunfzbrazwiaylf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_XfyM6kOLbcyAbGepLM8gIQ_xwuCUDER";


let supabaseClient = null;
let currentUser = null;
let currentProfile = null;


// 2. INITIALIZE SUPABASE
function initializeSupabase() {
  if (
    SUPABASE_URL.includes("PASTE_YOUR") ||
    SUPABASE_PUBLISHABLE_KEY.includes("PASTE_YOUR")
  ) {
    showMessage(
      "authMessage",
      "Setup required: enter your Supabase URL and publishable key in app.js."
    );
    return false;
  }

  if (!window.supabase?.createClient) {
    showMessage(
      "authMessage",
      "Supabase did not load. Check your internet connection and refresh."
    );
    return false;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  document.getElementById("setupNotice").hidden = true;
  return true;
}


// 3. SHARED HELPERS
function showMessage(id, message) {
  const element = document.getElementById(id);
  if (element) element.textContent = message;
}

function showOutput(id, data) {
  const element = document.getElementById(id);
  if (!element) return;

  element.hidden = false;
  element.textContent = JSON.stringify(data, null, 2);
}

function hideOutput(id) {
  const element = document.getElementById(id);
  if (!element) return;

  element.hidden = true;
  element.textContent = "";
}

function getErrorDetails(error) {
  if (!error) return null;

  return {
    message: error.message || "Unknown error",
    code: error.code || null
  };
}

function isLoggedIn() {
  return Boolean(supabaseClient && currentUser && currentProfile);
}

function getSubmissionId(inputId) {
  const value = document.getElementById(inputId).value.trim();

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!value) {
    return {
      valid: false,
      value: "",
      message: "Please enter a submission UUID."
    };
  }

  if (!uuidPattern.test(value)) {
    return {
      valid: false,
      value,
      message: "Please enter a valid submission UUID."
    };
  }

  return { valid: true, value, message: "" };
}

function requireRole(role, messageId) {
  if (!isLoggedIn() || currentProfile.role !== role) {
    showMessage(
      messageId,
      `Please sign in with the ${role === "staff" ? "Staff" : "Scholar"} account to run this test.`
    );
    return false;
  }

  return true;
}


// 4. LOGIN
document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabaseClient && !initializeSupabase()) return;

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const loginButton = document.getElementById("loginButton");

  loginButton.disabled = true;
  showMessage("authMessage", "Signing in...");

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    currentUser = data.user;

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", currentUser.id)
      .single();

    if (profileError) {
      await supabaseClient.auth.signOut();
      currentUser = null;
      throw new Error(`Could not load your profile: ${profileError.message}`);
    }

    if (!["staff", "scholar"].includes(profile.role)) {
      await supabaseClient.auth.signOut();
      currentUser = null;
      throw new Error("Unsupported account role.");
    }

    currentProfile = profile;

    document.getElementById("authSection").hidden = true;
    document.getElementById("appSection").hidden = false;

    document.getElementById("welcomeTitle").textContent =
      `Welcome, ${profile.full_name || "User"}`;

    document.getElementById("roleLabel").textContent =
      `Signed in as: ${profile.role}`;

    const staff = profile.role === "staff";
    document.getElementById("staffSection").hidden = !staff;
    document.getElementById("scholarSection").hidden = staff;

    showMessage("authMessage", "");
  } catch (error) {
    showMessage("authMessage", error.message || "Sign-in failed.");
  } finally {
    loginButton.disabled = false;
  }
});


// 5. LOGOUT
document.getElementById("logoutButton").addEventListener("click", async () => {
  if (!supabaseClient) return;

  const { error } = await supabaseClient.auth.signOut();

  currentUser = null;
  currentProfile = null;

  document.getElementById("appSection").hidden = true;
  document.getElementById("authSection").hidden = false;
  document.getElementById("loginForm").reset();

  showMessage(
    "authMessage",
    error ? `Sign-out error: ${error.message}` : "Signed out successfully."
  );
});


// 6. S04 — RETURN REQUIRES A REASON
document.getElementById("testReturnButton").addEventListener("click", async () => {
  if (!requireRole("staff", "rpcMessage")) return;

  const submission = getSubmissionId("submissionId");
  if (!submission.valid) {
    showMessage("rpcMessage", submission.message);
    return;
  }

  showMessage("rpcMessage", "Testing return-without-reason protection...");
  hideOutput("rpcOutput");

  const { data, error } = await supabaseClient.rpc("verify_submission", {
    p_submission_id: submission.value,
    p_status: "returned",
    p_reason: ""
  });

  showOutput("rpcOutput", { data, error: getErrorDetails(error) });

  if (error?.message?.toLowerCase().includes("reason is required")) {
    showMessage("rpcMessage", "PASS — the backend rejected a return without a reason.");
  } else if (error) {
    showMessage("rpcMessage", `Request rejected for another reason: ${error.message}`);
  } else {
    showMessage("rpcMessage", "FAIL — the backend accepted a return without a reason.");
  }
});


// 7. S05 — CANNOT EVALUATE BEFORE VERIFICATION
document.getElementById("testEvaluationGateButton").addEventListener("click", async () => {
  if (!requireRole("staff", "evaluationGateMessage")) return;

  const submission = getSubmissionId("evaluationTestSubmissionId");
  if (!submission.valid) {
    showMessage("evaluationGateMessage", submission.message);
    return;
  }

  showMessage("evaluationGateMessage", "Testing the evaluation gate...");
  hideOutput("evaluationGateOutput");

  const { data, error } = await supabaseClient.rpc("evaluate_compliance", {
    p_submission_id: submission.value
  });

  showOutput("evaluationGateOutput", { data, error: getErrorDetails(error) });

  if (error?.message?.toLowerCase().includes("verify the grade evidence")) {
    showMessage("evaluationGateMessage", "PASS — the backend blocked evaluation before verification.");
  } else if (error) {
    showMessage("evaluationGateMessage", `Request rejected: ${error.message}`);
  } else {
    showMessage("evaluationGateMessage", "FAIL — evaluation succeeded. Check the verification status.");
  }
});


// 8. S06 — CANNOT APPROVE RENEWAL BEFORE REQUIRED CHECKS
document.getElementById("testRenewalGateButton").addEventListener("click", async () => {
  if (!requireRole("staff", "renewalGateMessage")) return;

  const submission = getSubmissionId("renewalTestSubmissionId");
  if (!submission.valid) {
    showMessage("renewalGateMessage", submission.message);
    return;
  }

  showMessage("renewalGateMessage", "Testing the renewal approval gate...");
  hideOutput("renewalGateOutput");

  const { data, error } = await supabaseClient.rpc("record_renewal_decision", {
    p_submission_id: submission.value,
    p_decision: "approved",
    p_notes: "S06 security test — approval before required checks"
  });

  showOutput("renewalGateOutput", { data, error: getErrorDetails(error) });

  const message = error?.message?.toLowerCase() || "";

  if (
    error &&
    (message.includes("verified") ||
      message.includes("evaluat") ||
      message.includes("compliance"))
  ) {
    showMessage("renewalGateMessage", "PASS — the backend blocked premature renewal approval.");
  } else if (error) {
    showMessage("renewalGateMessage", `Request rejected. Check the reason: ${error.message}`);
  } else {
    showMessage("renewalGateMessage", "FAIL — approval succeeded. Review the backend gate.");
  }
});


// 9. S03 — SCHOLAR CANNOT VERIFY EVIDENCE
document.getElementById("testScholarVerifyButton").addEventListener("click", async () => {
  if (!requireRole("scholar", "scholarRpcMessage")) return;

  const submission = getSubmissionId("scholarTestSubmissionId");
  if (!submission.valid) {
    showMessage("scholarRpcMessage", submission.message);
    return;
  }

  showMessage("scholarRpcMessage", "Testing Scholar verification authorization...");
  hideOutput("scholarRpcOutput");

  const { data, error } = await supabaseClient.rpc("verify_submission", {
    p_submission_id: submission.value,
    p_status: "verified",
    p_reason: null
  });

  showOutput("scholarRpcOutput", { data, error: getErrorDetails(error) });

  if (error?.message?.toLowerCase().includes("only scholarship staff")) {
    showMessage("scholarRpcMessage", "PASS — the backend blocked the Scholar from verifying evidence.");
  } else if (error) {
    showMessage("scholarRpcMessage", `Request rejected. Check the reason: ${error.message}`);
  } else {
    showMessage("scholarRpcMessage", "FAIL — the Scholar's verification request succeeded.");
  }
});


// 10. S07 — SCHOLAR CANNOT CHANGE PROTECTED FIELDS
document.getElementById("testProtectedFieldsButton").addEventListener("click", async () => {
  if (!requireRole("scholar", "protectedFieldsMessage")) return;

  const submission = getSubmissionId("protectedFieldSubmissionId");
  if (!submission.valid) {
    showMessage("protectedFieldsMessage", submission.message);
    return;
  }

  showMessage("protectedFieldsMessage", "Testing protected-field permissions...");
  hideOutput("protectedFieldsOutput");

  const { data, error } = await supabaseClient
    .from("grade_submissions")
    .update({ verification_status: "verified" })
    .eq("id", submission.value)
    .eq("scholar_id", currentUser.id)
    .select("id, verification_status");

  showOutput("protectedFieldsOutput", {
    data,
    error: getErrorDetails(error)
  });

  if (
    error &&
    (
      error.code === "42501" ||
      error.message.toLowerCase().includes("permission denied") ||
      error.message.toLowerCase().includes("not allowed")
    )
  ) {
    showMessage(
      "protectedFieldsMessage",
      "PASS — Supabase rejected the Scholar's protected-field update."
    );
  } else if (error) {
    showMessage(
      "protectedFieldsMessage",
      `INCONCLUSIVE — inspect the error: ${error.message}`
    );
  } else if (data && data.length > 0) {
    showMessage(
      "protectedFieldsMessage",
      "FAIL — the protected-field update succeeded. Review database permissions immediately."
    );
  } else {
    showMessage(
      "protectedFieldsMessage",
      "INCONCLUSIVE — no matching row was returned. Verify the UUID and Scholar ownership."
    );
  }
});


// 11. S08A — STAFF CAN READ AUDIT HISTORY
document.getElementById("testStaffAuditButton").addEventListener("click", async () => {
  if (!requireRole("staff", "staffAuditMessage")) return;

  showMessage("staffAuditMessage", "Loading recent audit records...");
  hideOutput("staffAuditOutput");

  const { data, error } = await supabaseClient
    .from("audit_logs")
    .select("id, actor_id, action, target_table, target_id, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  showOutput("staffAuditOutput", { data, error: getErrorDetails(error) });

  if (error) {
    showMessage("staffAuditMessage", `FAIL — could not read audit history: ${error.message}`);
  } else if (data && data.length > 0) {
    showMessage(
      "staffAuditMessage",
      `PASS — staff can read audit history. ${data.length} record(s) returned.`
    );
  } else {
    showMessage(
      "staffAuditMessage",
      "INCONCLUSIVE — the query succeeded, but no audit records were found. Check the audit trigger."
    );
  }
});


// 12. S08B — SCHOLAR CANNOT READ STAFF-ONLY AUDIT HISTORY
document.getElementById("testScholarAuditButton").addEventListener("click", async () => {
  if (!requireRole("scholar", "scholarAuditMessage")) return;

  showMessage("scholarAuditMessage", "Testing Scholar audit-history access...");
  hideOutput("scholarAuditOutput");

  const { data, error } = await supabaseClient
    .from("audit_logs")
    .select("id, action, target_table, created_at")
    .limit(10);

  showOutput("scholarAuditOutput", { data, error: getErrorDetails(error) });

  if (
    error &&
    (
      error.code === "42501" ||
      error.message.toLowerCase().includes("permission denied")
    )
  ) {
    showMessage(
      "scholarAuditMessage",
      "PASS — the backend denied the Scholar access to audit history."
    );
  } else if (error) {
    showMessage(
      "scholarAuditMessage",
      `INCONCLUSIVE — inspect the error: ${error.message}`
    );
  } else if (data && data.length === 0) {
    showMessage(
      "scholarAuditMessage",
      "Potential PASS — no audit rows are visible to the Scholar. Confirm that records exist by running the Staff audit test."
    );
  } else {
    showMessage(
      "scholarAuditMessage",
      "FAIL — audit records are visible to the Scholar. Review the audit_logs RLS policy."
    );
  }
});


// 13. START THE APPLICATION
initializeSupabase();
