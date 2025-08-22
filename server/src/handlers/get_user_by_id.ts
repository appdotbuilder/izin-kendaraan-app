import { type User } from '../schema';

export async function getUserById(userId: number): Promise<User | null> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching a specific user by their ID.
    // Used for authentication middleware and getting user details.
    // Returns null if user not found.
    return Promise.resolve({
        id: userId,
        nik: "1234567890",
        username: "sample_user",
        password: "hashed_password",
        nama: "Sample User",
        role: "Karyawan" as const,
        fcm_token: null,
        created_at: new Date()
    } as User);
}