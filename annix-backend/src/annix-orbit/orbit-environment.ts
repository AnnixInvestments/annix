export type OrbitEnvironment = "prod" | "test";

/**
 * Which environment THIS running backend belongs to, derived from the Orbit
 * database it is connected to (orbit_test → test, anything else → prod).
 *
 * Early-access signups always live on prod, but the invite email lets an admin
 * pick which environment a recipient is sent to. This helper lets both the
 * outreach send (don't provision an account in the wrong cluster) and the
 * registration gate (don't let a test-invitee create a prod account) compare
 * the invited environment against the one actually handling the request.
 */
export function currentOrbitEnvironment(): OrbitEnvironment {
  const db = (process.env.ORBIT_MONGO_DATABASE ?? process.env.MONGO_DATABASE ?? "").toLowerCase();
  return db.includes("test") ? "test" : "prod";
}
