export async function login(username, password) {
  const res = await fetch("http://localhost:8000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return res.json();
}

export async function submitApplication(payload, token) {
  const res = await fetch("http://localhost:8000/v1/decision", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function askAnalyst(question, applicationId, token) {
  const res = await fetch("http://localhost:8000/v1/analyst/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ question, application_id: applicationId }),
  });
  if (!res.ok) throw new Error(`Assistant error: ${res.status}`);
  return res.json();
}