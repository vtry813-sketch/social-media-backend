# Social Media Backend API

A comprehensive social media backend system built with Node.js, Express.js, MongoDB, and Redis. This project provides a complete REST API for user management, posts, comments, follows, likes, shares, and notifications.

## Features

### User Management
- User registration and authentication with JWT
- Profile management (update profile, change password)
- Account deactivation
- User search and discovery

### Social Features
- Create, read, update, delete posts
- Like and unlike posts
- Comment on posts (with nested replies)
- Follow/unfollow users
- Share posts
- Private/public account settings

### Content Management
- Post visibility controls (public, followers-only, private)
- Media upload support (images/videos)
- Post editing with history tracking
- Content moderation capabilities

### Notifications
- Real-time notifications for interactions
- Like notifications
- Comment and reply notifications
- Follow request notifications
- Share notifications

### Performance & Security
- Redis caching for popular content
- Rate limiting
- Input validation and sanitization
- CORS protection
- Helmet security headers
- Password hashing with bcrypt

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express-validator
- **Security**: Helmet, CORS, bcryptjs
- **Rate Limiting**: Express-rate-limit

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Redis (v6 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd social-media-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/social-media-db
   REDIS_URL=redis://localhost:6379

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000

   # Email Configuration (optional - for notifications)
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password

   # Cloud Storage (optional - for media uploads)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. **Start MongoDB and Redis**
   Make sure MongoDB and Redis are running on your system.

5. **Run the application**
   ```bash
   # Development mode with nodemon
   npm run dev

   # Production mode
   npm start
   ```

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "johndoe", // or email
  "password": "password123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

### Posts Endpoints

#### Create Post
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hello world!",
  "visibility": "public",
  "tags": ["hello", "world"],
  "media": [
    {
      "type": "image",
      "url": "https://example.com/image.jpg",
      "publicId": "image123"
    }
  ]
}
```

#### Get Feed Posts
```http
GET /api/posts?page=1&limit=20
Authorization: Bearer <token>
```

#### Like Post
```http
POST /api/posts/:id/like
Authorization: Bearer <token>
```

### Comments Endpoints

#### Create Comment
```http
POST /api/posts/:postId/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great post!"
}
```

#### Get Comments
```http
GET /api/posts/:postId/comments?page=1&limit=20
Authorization: Bearer <token>
```

### Follow System

#### Follow User
```http
POST /api/follow/:userId
Authorization: Bearer <token>
```

#### Get Followers
```http
GET /api/follow/:userId/followers?page=1&limit=20
Authorization: Bearer <token>
```

### Notifications

#### Get Notifications
```http
GET /api/notifications?page=1&limit=20
Authorization: Bearer <token>
```

#### Mark as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

## Project Structure

```
social-media-backend/
├── config/
│   └── database.js          # Database connection configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── postController.js    # Post CRUD operations
│   ├── commentController.js # Comment management
│   ├── followController.js  # Follow/unfollow logic
│   └── notificationController.js # Notification handling
├── middleware/
│   ├── auth.js             # JWT authentication middleware
│   └── validation.js       # Input validation middleware
├── models/
│   ├── User.js             # User schema
│   ├── Post.js             # Post schema
│   ├── Comment.js          # Comment schema
│   ├── Follow.js           # Follow relationship schema
│   ├── Like.js             # Like schema
│   └── Notification.js     # Notification schema
├── routes/
│   ├── index.js            # Main routes file
│   ├── auth.js             # Authentication routes
│   ├── posts.js            # Post routes
│   ├── comments.js         # Comment routes
│   ├── follow.js           # Follow routes
│   └── notifications.js    # Notification routes
├── server.js               # Main server file
├── .env                    # Environment variables
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Rate Limiting**: Prevents abuse with request limits
- **Input Validation**: Comprehensive validation using express-validator
- **CORS Protection**: Configured CORS for frontend integration
- **Security Headers**: Helmet.js for security headers
- **SQL Injection Protection**: MongoDB/Mongoose built-in protection

## Database Schema

### User Model
- Personal information (name, email, username)
- Authentication data (password hash)
- Profile settings (bio, pictures, location)
- Social stats (followers, following counts)
- Privacy settings

### Post Model
- Content and media
- Author and timestamps
- Engagement metrics (likes, comments, shares)
- Visibility settings
- Edit history

### Comment Model
- Content and author
- Parent post and optional parent comment (for replies)
- Likes and replies

### Follow Model
- Follower and following relationships
- Status (pending/accepted for private accounts)

### Notification Model
- Recipient and sender
- Notification type and content
- Read status and timestamps

## Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/social-media-prod
REDIS_URL=redis://your-redis-instance:6379
JWT_SECRET=your-production-jwt-secret-key
```

### PM2 Deployment (Recommended)
```bash
npm install -g pm2
pm2 start server.js --name "social-media-api"
pm2 startup
pm2 save
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

## Performance Optimizations

- **Redis Caching**: Popular posts and user feeds cached for 5-10 minutes
- **Database Indexing**: Optimized indexes on frequently queried fields
- **Pagination**: Efficient pagination for large datasets
- **Rate Limiting**: Prevents server overload
- **Connection Pooling**: MongoDB connection pooling

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
