# 🎬 Movie Ticket Booking System with Pesapal Integration

A complete movie ticket booking system built with Express.js and integrated with Pesapal payment gateway for secure transactions.

## 🚀 Features

- **Movie Listings**: Browse available movies with showtimes and pricing
- **Ticket Booking**: Book multiple tickets for movies
- **Pesapal Integration**: Secure payment processing via Pesapal
- **Real-time Status**: Live payment status updates
- **Ticket Confirmation**: Digital tickets with QR codes
- **Responsive Design**: Works on desktop and mobile devices

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL database
- Pesapal developer account

## 🛠️ Installation

1. **Clone or create the project directory:**
```bash
mkdir movie-ticket-pesapal
cd movie-ticket-pesapal
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up MySQL database:**
   - Create a database named `movie_pesapal`
   - Run the SQL script from the first document to create tables and insert sample data

4. **Configure Pesapal credentials:**
   - Open `utils/pesapal.js`
   - Update the following lines with your actual Pesapal credentials:
   ```javascript
   const PESAPAL_CONFIG = {
       CONSUMER_KEY: 'your_actual_consumer_key_here',
       CONSUMER_SECRET: 'your_actual_consumer_secret_here',
       BASE_URL: 'https://cybqa.pesapal.com/pesapalv3', // Sandbox
       // For production: 'https://pay.pesapal.com/v3'
   };
   ```

5. **Update database connection:**
   - Open `server.js`
   - Update the database configuration:
   ```javascript
   const dbConfig = {
       host: 'localhost',
       user: 'root',
       password: 'your_mysql_password', // Update this
       database: 'movie_pesapal'
   };
   ```

## 🗄️ Database Setup

Run this SQL script in your MySQL database:

```sql
-- Create the database
CREATE DATABASE IF NOT EXISTS movie_pesapal;
USE movie_pesapal;

-- Movie table
CREATE TABLE IF NOT EXISTS movie (
    movieId INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    showTime DATETIME NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    imageUrl VARCHAR(500),
    dateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Ticket table
CREATE TABLE IF NOT EXISTS ticket (
    ticketId INT AUTO_INCREMENT PRIMARY KEY,
    movieId INT NOT NULL,
    customerName VARCHAR(255) NOT NULL,
    phoneNumber VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    totalAmount DECIMAL(10, 2) NOT NULL,
    paymentStatus ENUM('Pending', 'Completed', 'Failed') NOT NULL DEFAULT 'Pending',
    receiptNumber VARCHAR(100),
    paymentMethod VARCHAR(100),
    transactionDate DATETIME,
    dateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ticket_movie FOREIGN KEY (movieId) REFERENCES movie(movieId) ON DELETE CASCADE
);

-- PesapalInterimPayment table
CREATE TABLE IF NOT EXISTS pesapal_interim_payment (
    interimPaymentId INT AUTO_INCREMENT PRIMARY KEY,
    ticketId INT NOT NULL,
    orderTrackingId VARCHAR(255) NOT NULL,
    merchantReference VARCHAR(255) NOT NULL,
    iframeSrc TEXT NOT NULL,
    status ENUM('SAVED', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'SAVED',
    dateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pesapal_interim_ticket FOREIGN KEY (ticketId) REFERENCES ticket(ticketId) ON DELETE CASCADE
);
```

Then insert the sample movie data from the first document.

## 🚀 Running the Application

1. **Development mode:**
```bash
npm run dev
```

2. **Production mode:**
```bash
npm start
```

3. **Access the application:**
   - Open your browser and go to `http://localhost:3000`

## 📁 Project Structure

```
movie-ticket-pesapal/
├── server.js                 # Main Express server
├── package.json              # Dependencies and scripts
├── README.md                 # This file
├── utils/
│   └── pesapal.js            # Pesapal integration utilities
├── routes/
│   ├── movies.js             # Movie-related routes
│   ├── tickets.js            # Ticket-related routes
│   └── pesapal.js            # Payment processing routes
└── public/
    ├── index.html            # Main booking page
    └── ticket.html           # Ticket confirmation page
```

## 🔧 API Endpoints

### Movies
- `GET /api/movies` - Get all movies
- `GET /api/movies/:id` - Get specific movie

### Tickets
- `GET /api/tickets/:id` - Get ticket details
- `GET /api/tickets` - Get all tickets (admin)

### Payments
- `POST /api/make-payment` - Initiate payment
- `GET /api/pesapal/callback` - Payment callback handler
- `GET /api/pesapal/ipn` - IPN notification handler

## 💳 Payment Flow

1. **User selects movie** and enters booking details
2. **System creates ticket** with 'Pending' status
3. **Pesapal payment initiated** - user redirected to payment page
4. **User completes payment** on Pesapal
5. **Callback/IPN updates** ticket status to 'Completed'
6. **User sees confirmation** page with ticket details

## 🔍 Testing

### Console Logging
The application includes extensive console logging to help students understand the flow:

- 🎬 Movie operations
- 💳 Payment processing
- 📡 API requests/responses
- ✅ Success operations
- ❌ Error handling

### Test Payment Flow
1. Start the application
2. Visit `http://localhost:3000`
3. Select a movie and book tickets
4. Use Pesapal test credentials for payments
5. Monitor console for detailed logs

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error:**
   - Ensure MySQL is running
   - Check database credentials in `server.js`

2. **Pesapal Authentication Error:**
   - Verify consumer key and secret in `utils/pesapal.js`
   - Ensure you're using the correct base URL (sandbox vs production)

3. **Payment Not Completing:**
   - Check IPN URL is accessible from internet
   - Verify callback URL configuration

### Debug Mode
Monitor the console output for detailed logs of all operations.

## 📚 Learning Objectives

This project demonstrates:
- **Express.js** server setup and routing
- **MySQL** database integration
- **Payment gateway** integration (Pesapal)
- **RESTful API** design
- **Frontend-backend** communication
- **Error handling** and logging
- **Callback/webhook** handling

## 🔒 Security Notes

- Update Pesapal credentials before production use
- Implement proper input validation
- Add rate limiting for API endpoints
- Use HTTPS in production
- Sanitize database inputs

## 📞 Support

For issues or questions, contact: +254 114 742 348 (WhatsApp)
