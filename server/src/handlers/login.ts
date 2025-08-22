import { type LoginInput, type AuthResponse } from '../schema';

export async function login(input: LoginInput): Promise<AuthResponse> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is authenticating a user by validating username/password,
    // updating FCM token if provided, and returning user data with JWT token.
    return Promise.resolve({
        user: {
            id: 1,
            nik: "1234567890",
            username: input.username,
            password: "hashed_password",
            nama: "Sample User",
            role: "Karyawan" as const,
            fcm_token: input.fcm_token || null,
            created_at: new Date()
        },
        token: "jwt_token_placeholder"
    } as AuthResponse);
}