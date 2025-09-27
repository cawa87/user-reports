# User Reports - GitLab & ClickUp Statistics Tracker

## 🚀 Features

### GitLab Integration
- **Commit Tracking**: Monitor commits, additions, deletions, and file changes
- **Code Statistics**: Lines of code contributed, repository activity
- **Contributor Analytics**: Top contributors, commit frequency, code quality metrics
- **Project Insights**: Cross-project statistics and comparisons

### ClickUp Integration
- **Task Management**: Track task statuses, completion rates, and time spent
- **Productivity Metrics**: Tasks completed per day/week/month
- **Time Tracking**: Detailed time analysis and productivity trends
- **Priority Analysis**: Task priority distribution and completion patterns

### Enhanced Statistics
- **Productivity Scores**: Comprehensive scoring based on commits, tasks, and time
- **Trend Analysis**: Weekly/monthly productivity trends
- **Team Comparisons**: Relative performance metrics
- **Goal Tracking**: Set and monitor productivity goals
- **Burndown Charts**: Sprint and project progress visualization

### Modern UI
- **Responsive Design**: Mobile-first, fully responsive interface
- **Real-time Updates**: Live data synchronization and updates
- **Interactive Charts**: Beautiful visualizations with Chart.js
- **Dark/Light Mode**: Theme switching support
- **Export Capabilities**: CSV/PDF export for reports

## 📸 Screenshots

### Dashboard Overview
![Dashboard](screenshots/01-dashboard.png)
*Executive dashboard with key performance indicators, team productivity trends, and quick navigation to detailed analytics.*

### User Management
![Users](screenshots/02-users.png)
*Comprehensive user analytics with advanced filtering, search capabilities, and detailed productivity metrics for each team member.*

### Project Analytics
![Projects](screenshots/03-projects.png)
*GitLab repository insights showing commit statistics, contributor analysis, and project performance metrics with recent activity tracking.*

### Project Details
![Project Details](screenshots/04-project-details.png)
*Deep dive into individual project performance with commit history, contributor rankings, activity charts, and detailed code statistics.*

### Task Management
![Tasks](screenshots/05-tasks.png)
*ClickUp task analytics featuring completion rates, priority distribution, assignee performance, and comprehensive task tracking.*

### Advanced Analytics
![Analytics](screenshots/06-analytics.png)
*Comprehensive business intelligence dashboard with trend analysis, project performance comparisons, and detailed reporting capabilities.*

## 🛠 Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL with Prisma ORM
- Redis for caching
- JWT authentication
- Automated data synchronization

**Frontend:**
- React 18 + TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Chart.js for visualizations
- React Router for navigation

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm 8+
- Docker and Docker Compose
- GitLab instance with API access
- ClickUp account with API access

### Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd userreports
   npm run setup
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API credentials
   ```

3. **Start database**:
   ```bash
   npm run docker:up
   ```

4. **Initialize database**:
   ```bash
   npm run db:setup
   ```

5. **Start development servers**:
   ```bash
   npm run dev
   ```

6. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 🔧 Configuration

### GitLab Setup
1. Generate a personal access token with `read_user`, `read_repository` scopes
2. Add your GitLab URL and token to `.env`
3. Specify project IDs to track (comma-separated)

### ClickUp Setup
1. Generate an API token from ClickUp settings
2. Find your team ID from ClickUp URL
3. Add credentials to `.env`

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/userreports"

# GitLab
GITLAB_URL="https://your-gitlab.com"
GITLAB_ACCESS_TOKEN="your-token"
GITLAB_PROJECT_IDS="1,2,3"

# ClickUp
CLICKUP_API_TOKEN="your-token"
CLICKUP_TEAM_ID="your-team-id"
CLICKUP_SPACE_IDS="space1,space2"
```

## 📊 API Endpoints

### Dashboard
- `GET /api/dashboard` - Overview statistics
- `GET /api/dashboard/trends` - Productivity trends
- `GET /api/dashboard/leaderboard` - Top performers

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id/stats` - Detailed user statistics
- `GET /api/users/:id/trends` - User productivity trends

### Projects
- `GET /api/projects` - GitLab projects overview
- `GET /api/projects/:id/stats` - Project-specific statistics

### Tasks
- `GET /api/tasks` - ClickUp tasks overview
- `GET /api/tasks/analytics` - Task completion analytics

### Sync
- `POST /api/sync` - Manual data synchronization
- `GET /api/sync/status` - Sync status and logs

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

---

Built with ❤️ for better team productivity tracking
