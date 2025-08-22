import { type UpdateFcmTokenInput, type User } from '../schema';

export async function updateFcmToken(input: UpdateFcmTokenInput): Promise<User> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is updating the FCM token for a specific user
    // to enable push notifications. This is called when the mobile app
    // receives a new FCM token or when the user logs in.
    return Promise.resolve({
        id: input.user_id,
        nik: "1234567890",
        username: "sample_user",
        password: "hashed_password",
        nama: "Sample User",
        role: "Karyawan" as const,
        fcm_token: input.fcm_token,
        created_at: new Date()
    } as User);
}