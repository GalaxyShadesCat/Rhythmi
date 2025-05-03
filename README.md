# Rhythmi - Heart Rate Monitoring Application

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Overview
Rhythmi is a comprehensive heart rate monitoring application that allows users to track and analyze their heart rate data in real-time. The application supports Bluetooth heart rate sensors (like Polar H10) and provides detailed analysis of heart rate patterns during rest, exercise, and recovery phases.

### Key Features
- Real-time heart rate monitoring via Bluetooth
- ECG data streaming and analysis
- Heart rate variability (HRV) calculations
- Signal quality assessment (both statistical and ML-based)
- Exercise session recording with rest, exercise, and recovery phases
- Historical data tracking and visualization
- Health chatbot for data interpretation
- User profile management
- MongoDB integration for data persistence

## Signal Quality Assessment
The application provides two methods for assessing ECG signal quality:

### Statistical Method (Default)
- Uses standard deviation of the signal
- Categories: "excellent" (< 300), "good" (< 400), "fair" (< 500), "poor" (≥ 500)
- Based on the most recent 5 seconds of data

### ML-based Method (Optional)
- Uses a TensorFlow.js model for classification
- Categories: "excellent" (class 2), "good" (class 1), "poor" (class 0)
- Features include statistical measures, frequency domain analysis, and peak detection
- Requires model files in `/public/tfjs_model/model.json` and `/public/scaler.json`
- To use ML-based assessment, uncomment the relevant lines in `NewRecord.tsx`

## Installation Instructions

### 2.1 Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- MongoDB (local instance or MongoDB Atlas account)
- Bluetooth-enabled device (for heart rate sensor connection)

### 2.2 Install Dependencies
```bash
# Clone the repository
git clone [repository-url]
cd rhythmi

# Install dependencies
npm install
```

### 2.3 Set up Environment Variables
Create a `.env.local` file in the root directory with the following variables:
```env
# Required: MongoDB connection string
MONGODB_URI=your_mongodb_connection_string

# Required: OpenRouter API key for the health chatbot
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key
```

> **Important**: The application will not build or run without these environment variables. Make sure to:
> 1. Create the `.env.local` file before running the development server
> 2. Use valid MongoDB connection strings (e.g., `mongodb+srv://username:password@cluster.mongodb.net/database`)
> 3. Keep your API keys secure and never commit them to version control

### 2.4 Start the Development Server
```bash
# Start the development server
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

### 2.5 Open the App in Your Browser
The application will be available at `http://localhost:3000`. You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Connecting to MongoDB
To link the app to your MongoDB database:

1. Create a MongoDB Atlas cluster or use a local MongoDB instance
2. Copy the connection string from MongoDB Atlas and paste it into the `.env.local` file
3. The application will automatically create the necessary collections:
   - `records`: Stores heart rate and ECG data
   - `users`: Stores user profiles and preferences

## Deployment
The application can be deployed to Vercel:

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Configure the environment variables in Vercel's dashboard
4. Deploy the application

## Technology Stack
- **Frontend**: Next.js, React, Material-UI
- **Backend**: Next.js API routes
- **Database**: MongoDB
- **State Management**: React Hooks
- **Styling**: Tailwind CSS, Material-UI
- **Charts**: Chart.js
- **AI Integration**: OpenRouter API
- **Fonts**: 
  - Primary: Inter (sans-serif)
  - Secondary: Roboto Mono (monospace)
  - Icons: Material Icons

## Development
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details.
