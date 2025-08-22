export interface PushNotificationData {
    fcm_token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
}

interface FirebaseError extends Error {
    code?: string;
}

// Mock Firebase Admin SDK functionality since it's not available as a dependency
export class MockFirebaseAdmin {
    private static initialized = false;

    static reset() {
        this.initialized = false;
    }

    static initialize() {
        // Always check environment variables, regardless of initialized state
        // This allows us to detect when env vars change between tests
        const projectId = process.env['FIREBASE_PROJECT_ID'];
        const clientEmail = process.env['FIREBASE_CLIENT_EMAIL'];
        const privateKey = process.env['FIREBASE_PRIVATE_KEY'];



        if (!projectId || !clientEmail || !privateKey || 
            projectId === 'undefined' || clientEmail === 'undefined' || privateKey === 'undefined') {
            throw new Error('Firebase initialization failed: Missing required environment variables');
        }

        if (!this.initialized) {
            this.initialized = true;
            console.log('Firebase Admin SDK initialized successfully');
        }
    }

    static async sendMessage(token: string, title: string, body: string, data: Record<string, string> = {}): Promise<string> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 10));

        // Simulate various error conditions based on token patterns
        if (token === 'invalid-token') {
            const error = new Error('Invalid registration token') as FirebaseError;
            error.code = 'messaging/invalid-registration-token';
            throw error;
        }

        if (token === 'unregistered-token') {
            const error = new Error('Registration token not registered') as FirebaseError;
            error.code = 'messaging/registration-token-not-registered';
            throw error;
        }

        if (token === 'quota-exceeded-token') {
            const error = new Error('Quota exceeded') as FirebaseError;
            error.code = 'messaging/quota-exceeded';
            throw error;
        }

        if (token === 'network-error-token') {
            throw new Error('Network error');
        }

        // Return mock message ID
        return `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    static async sendMulticast(tokens: string[], title: string, body: string, data: Record<string, string> = {}): Promise<{
        successCount: number;
        failureCount: number;
        responses: Array<{ success: boolean; messageId?: string; error?: { message: string } }>;
    }> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 20));

        const responses = await Promise.allSettled(
            tokens.map(token => this.sendMessage(token, title, body, data))
        );

        let successCount = 0;
        let failureCount = 0;

        const formattedResponses = responses.map((result) => {
            if (result.status === 'fulfilled') {
                successCount++;
                return {
                    success: true,
                    messageId: result.value
                };
            } else {
                failureCount++;
                return {
                    success: false,
                    error: { message: result.reason.message }
                };
            }
        });

        return {
            successCount,
            failureCount,
            responses: formattedResponses
        };
    }
}

export async function sendPushNotification(notificationData: PushNotificationData): Promise<boolean> {
    try {
        // Validate input
        if (!notificationData.fcm_token) {
            console.error('Push notification failed: Missing FCM token');
            return false;
        }

        if (!notificationData.title || !notificationData.body) {
            console.error('Push notification failed: Missing title or body');
            return false;
        }

        // Initialize Firebase if needed
        try {
            MockFirebaseAdmin.initialize();
        } catch (initError) {
            console.error('Firebase initialization failed:', initError);
            return false;
        }

        // Send the notification
        const response = await MockFirebaseAdmin.sendMessage(
            notificationData.fcm_token,
            notificationData.title,
            notificationData.body,
            notificationData.data || {}
        );
        
        console.log(`Push notification sent successfully: ${notificationData.title} to ${notificationData.fcm_token}, Response: ${response}`);
        return true;

    } catch (error: any) {
        console.error('Push notification failed:', error);

        // Handle specific FCM errors
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
            console.error('Invalid or unregistered FCM token:', notificationData.fcm_token);
        } else if (error.code === 'messaging/mismatched-credential') {
            console.error('Firebase credentials mismatch');
        } else if (error.code === 'messaging/quota-exceeded') {
            console.error('FCM quota exceeded');
        } else {
            console.error('Unknown FCM error:', error.message);
        }

        return false;
    }
}

// Helper function to send notification to multiple tokens
export async function sendBulkPushNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<{ success: number; failed: number }> {
    try {
        try {
            MockFirebaseAdmin.initialize();
        } catch (initError) {
            console.error('Firebase initialization failed:', initError);
            return { success: 0, failed: tokens.length };
        }

        // Filter out invalid tokens
        const validTokens = tokens.filter(token => token && token.trim().length > 0);
        
        if (validTokens.length === 0) {
            console.error('No valid FCM tokens provided');
            return { success: 0, failed: 0 };
        }

        const response = await MockFirebaseAdmin.sendMulticast(
            validTokens,
            title,
            body,
            data || {}
        );
        
        console.log(`Bulk notification sent: ${response.successCount} successful, ${response.failureCount} failed`);
        
        // Log failed tokens for debugging
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`Failed to send to token ${validTokens[idx]}: ${resp.error?.message}`);
                }
            });
        }

        return {
            success: response.successCount,
            failed: response.failureCount
        };

    } catch (error) {
        console.error('Bulk push notification failed:', error);
        return { success: 0, failed: tokens.length };
    }
}