import { query } from '../db/postgres';
import { User, RefreshTokenRecord } from '../domain/types';

export class UserRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    const sql = `
      SELECT id, email, name, password_hash as "passwordHash", token_version as "tokenVersion", role, avatar_url as "avatarUrl", created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE email = $1
    `;
    const rows = await query<any>(sql, [email.trim().toLowerCase()]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      email: r.email,
      name: r.name,
      passwordHash: r.passwordHash || r.password_hash || null,
      tokenVersion: r.tokenVersion !== undefined ? Number(r.tokenVersion) : (r.token_version !== undefined ? Number(r.token_version) : 0),
      role: r.role || 'trader',
      avatarUrl: r.avatarUrl || r.avatar_url || null,
      createdAt: r.createdAt ? new Date(r.createdAt) : (r.created_at ? new Date(r.created_at) : new Date()),
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : (r.updated_at ? new Date(r.updated_at) : undefined),
    };
  }

  async findUserById(id: string): Promise<User | null> {
    const sql = `
      SELECT id, email, name, password_hash as "passwordHash", token_version as "tokenVersion", role, avatar_url as "avatarUrl", created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE id = $1
    `;
    const rows = await query<any>(sql, [id]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      email: r.email,
      name: r.name,
      passwordHash: r.passwordHash || r.password_hash || null,
      tokenVersion: r.tokenVersion !== undefined ? Number(r.tokenVersion) : (r.token_version !== undefined ? Number(r.token_version) : 0),
      role: r.role || 'trader',
      avatarUrl: r.avatarUrl || r.avatar_url || null,
      createdAt: r.createdAt ? new Date(r.createdAt) : (r.created_at ? new Date(r.created_at) : new Date()),
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : (r.updated_at ? new Date(r.updated_at) : undefined),
    };
  }

  async createUser(user: {
    id: string;
    email: string;
    name: string;
    passwordHash: string | null;
    role?: 'trader' | 'admin';
    avatarUrl?: string | null;
  }): Promise<User> {
    const sql = `
      INSERT INTO users (id, email, name, password_hash, token_version, role, avatar_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, name, password_hash as "passwordHash", token_version as "tokenVersion", role, avatar_url as "avatarUrl", created_at as "createdAt", updated_at as "updatedAt"
    `;
    const rows = await query<any>(sql, [
      user.id,
      user.email.trim().toLowerCase(),
      user.name,
      user.passwordHash,
      0,
      user.role || 'trader',
      user.avatarUrl || null,
    ]);
    const r = rows[0];
    return {
      id: r.id,
      email: r.email,
      name: r.name,
      passwordHash: r.passwordHash || r.password_hash || null,
      tokenVersion: r.tokenVersion !== undefined ? Number(r.tokenVersion) : 0,
      role: r.role || 'trader',
      avatarUrl: r.avatarUrl || r.avatar_url || null,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
    };
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    const sql = `UPDATE users SET token_version = token_version + 1, updated_at = NOW() WHERE id = $1`;
    await query(sql, [userId]);
  }

  async createRefreshToken(token: {
    id: string;
    familyId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    const sql = `
      INSERT INTO user_refresh_tokens (id, family_id, user_id, token_hash, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await query(sql, [token.id, token.familyId, token.userId, token.tokenHash, token.expiresAt]);
  }

  async claimRefreshToken(tokenHash: string, replacedBy: string): Promise<RefreshTokenRecord | null> {
    // Atomic claim: updates revoked_at and replaced_by only if revoked_at IS NULL
    const sql = `
      UPDATE user_refresh_tokens
      SET revoked_at = NOW(), replaced_by = $2
      WHERE token_hash = $1 AND revoked_at IS NULL
      RETURNING id, family_id as "familyId", user_id as "userId", token_hash as "tokenHash", expires_at as "expiresAt", revoked_at as "revokedAt", replaced_by as "replacedBy", created_at as "createdAt"
    `;
    const rows = await query<any>(sql, [tokenHash, replacedBy]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      familyId: r.familyId || r.family_id,
      userId: r.userId || r.user_id,
      tokenHash: r.tokenHash || r.token_hash,
      expiresAt: new Date(r.expiresAt || r.expires_at),
      revokedAt: r.revokedAt || r.revoked_at ? new Date(r.revokedAt || r.revoked_at) : null,
      replacedBy: r.replacedBy || r.replaced_by || null,
      createdAt: new Date(r.createdAt || r.created_at),
    };
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const sql = `
      SELECT id, family_id as "familyId", user_id as "userId", token_hash as "tokenHash", expires_at as "expiresAt", revoked_at as "revokedAt", replaced_by as "replacedBy", created_at as "createdAt"
      FROM user_refresh_tokens
      WHERE token_hash = $1
    `;
    const rows = await query<any>(sql, [tokenHash]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      familyId: r.familyId || r.family_id,
      userId: r.userId || r.user_id,
      tokenHash: r.tokenHash || r.token_hash,
      expiresAt: new Date(r.expiresAt || r.expires_at),
      revokedAt: r.revokedAt || r.revoked_at ? new Date(r.revokedAt || r.revoked_at) : null,
      replacedBy: r.replacedBy || r.replaced_by || null,
      createdAt: new Date(r.createdAt || r.created_at),
    };
  }

  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    const sql = `UPDATE user_refresh_tokens SET revoked_at = NOW() WHERE family_id = $1`;
    await query(sql, [familyId]);
  }

  async rekeyGuestData(guestDeviceId: string, newUserId: string): Promise<void> {
    // 1. Re-key guest watchlists
    await query(`UPDATE watchlists SET user_id = $1 WHERE user_id = $2`, [newUserId, guestDeviceId]);
    // 2. Re-key guest alerts
    await query(`UPDATE alerts SET user_id = $1 WHERE user_id = $2`, [newUserId, guestDeviceId]);
    // 3. Retire guest session
    await query(`DELETE FROM user_sessions WHERE user_id = $1`, [guestDeviceId]);
  }

  async createPasswordResetToken(data: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    const sql = `
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
      VALUES ($1, $2, $3, $4)
    `;
    await query(sql, [data.id, data.userId, data.tokenHash, data.expiresAt]);
  }

  async findValidPasswordResetToken(tokenHash: string): Promise<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  } | null> {
    const sql = `
      SELECT id, user_id as "userId", token_hash as "tokenHash", expires_at as "expiresAt", used_at as "usedAt", created_at as "createdAt"
      FROM password_reset_tokens
      WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL
    `;
    const rows = await query<any>(sql, [tokenHash]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      userId: r.userId || r.user_id,
      tokenHash: r.tokenHash || r.token_hash,
      expiresAt: new Date(r.expiresAt || r.expires_at),
      usedAt: r.usedAt || r.used_at ? new Date(r.usedAt || r.used_at) : null,
      createdAt: new Date(r.createdAt || r.created_at),
    };
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    const sql = `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`;
    await query(sql, [id]);
  }

  async updatePasswordHash(userId: string, newPasswordHash: string): Promise<void> {
    const sql = `UPDATE users SET password_hash = $1, token_version = token_version + 1, updated_at = NOW() WHERE id = $2`;
    await query(sql, [newPasswordHash, userId]);
  }
}

export const userRepository = new UserRepository();
