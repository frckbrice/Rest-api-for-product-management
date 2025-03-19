import fetch from 'node-fetch';
import  User  from '../models/user'; // Adjust the import according to your User model's path and structure

interface MessageToSend {
  title: string;
  text: string;
}

const sendPushNotificationToUser = async (pushToken: string | null, messageToSend: MessageToSend) => {
  if (!pushToken) return; // No push token found for the user

  const message = {
    to: pushToken,
    sound: 'default',
    title: messageToSend.title,
    body: messageToSend.text,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json(); // The response from Expo
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

export default sendPushNotificationToUser;
