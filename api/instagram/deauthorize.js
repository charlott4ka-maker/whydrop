// Instagram calls this when someone removes the app from their account. There
// is nothing to delete: the token and the history only ever existed on the
// user's device, and this server stores neither. So the callback exists to
// acknowledge the notice, which is what Meta requires it to do.
//
// The POST carries a signed_request; it is not read, because no lookup follows
// from it. Should this server ever start keeping anything per user, verify the
// signature with the app secret here first and delete by the user id inside.

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  return res.status(200).json({ ok: true });
}
