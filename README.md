# FitNova

FitNova is a comprehensive fitness tracking and community platform.
**360 CodeCraft 2026 Project**

## Features
- **User Authentication**: Secure login and registration.
- **Workout Tracking**: Log and monitor fitness progress.
- **Community Engagement**: Connect with other users, join groups, and participate in discussions.
- **Gamification**: Earn rewards and participate in challenges.
- **Trainer Connections**: Find and interact with fitness trainers.
- **Event Management**: Discover and join fitness events.
- **Real-time Chat**: Connect with trainers and the community.

## Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: MongoDB, Mongoose
- **Authentication**: JSON Web Tokens (JWT)

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB running locally or a MongoDB Atlas URI

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables. Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```
4. Start the server (development mode with watch):
   ```bash
   npm run dev
   ```
   Or start normally:
   ```bash
   npm start
   ```

## Application Structure & API Routes
The backend serves the API on various routes under `/api`, and also serves static content from the `public` directory.

- `/api/auth` - Authentication & user registration
- `/api/users` - User profiles and management
- `/api/workouts` - Tracking fitness activities
- `/api/community` - Social features & groups
- `/api/trainers` - Trainer listings
- `/api/events` - Event hosting and joining
- `/api/chat` - Messaging features
- `/api/notifications` - System and user alerts
- `/api/admin` - Administrative actions
- `/api/upload` - Media uploads
- `/api/challenges` - V3 Gamification features

## License
This project is licensed under the ISC License.
