// D1 batches are atomic. Keep predicates on every write to prevent replay/races.
export const reserveChallenge=`INSERT INTO admin_challenges
 (email,user_id,challenge,code_hash,expires_at,attempts,consumed,next_send_at,window_start,send_count)
 VALUES (?,?,?,?,?,0,1,?,?,1)
 ON CONFLICT(email) DO UPDATE SET user_id=excluded.user_id,challenge=excluded.challenge,
 code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,consumed=1,
 next_send_at=excluded.next_send_at,
 send_count=CASE WHEN admin_challenges.window_start<=? THEN 1 ELSE admin_challenges.send_count+1 END,
 window_start=CASE WHEN admin_challenges.window_start<=? THEN excluded.window_start ELSE admin_challenges.window_start END
 WHERE admin_challenges.next_send_at<=? AND (admin_challenges.window_start<=? OR admin_challenges.send_count<5)
 RETURNING challenge`;
export const attemptChallenge=`UPDATE admin_challenges SET attempts=attempts+1
 WHERE email=? AND user_id=? AND challenge=? AND consumed=0 AND expires_at>? AND attempts<5 RETURNING code_hash`;
export const createSession=`INSERT INTO admin_sessions (token_hash,email,user_id,expires_at)
 SELECT ?,email,user_id,? FROM admin_challenges
 WHERE email=? AND user_id=? AND challenge=? AND code_hash=? AND consumed=0 AND expires_at>? AND attempts<=5`;
export const consumeChallenge=`UPDATE admin_challenges SET consumed=1
 WHERE email=? AND user_id=? AND challenge=? AND code_hash=? AND consumed=0 AND expires_at>? AND attempts<=5`;
