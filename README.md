<<<<<<< HEAD
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

UserReports uses a **single `docker-compose.yml` file** with profiles for all deployment scenarios:

#### Quick Start Options
```bash
# Development (hot-reload)
npm run docker:up:dev

# Production (full stack with proxy)  
npm run docker:up:prod

# App-only (external DB/Redis)
npm run docker:up:app

# Stop all services
npm run docker:down
```

#### Available Profiles
- **`dev`** - Development with hot-reload (port 5173)
- **`prod`** - Production with Nginx proxy (port 80)  
- **`app`** - Applications only for external services
- **`full`** - Complete local stack (port 8080)
- **`db`** - Database services only

#### Environment Templates
```bash
# Choose your deployment type:
cp env.dev.example .env      # Development
cp env.prod.example .env     # Production  
cp env.app.example .env      # External services

# Edit .env with your API credentials
```

#### Management Commands
```bash
# Build and deploy
npm run docker:deploy:build

# Health monitoring
npm run docker:health:detailed

# View logs  
npm run docker:logs:api

# Backup database
npm run docker:backup

# Environment validation
npm run docker:validate:fix
```

#### Access URLs
- **Development**: http://localhost:5173 (Vite dev server)
- **Production**: http://localhost (via Nginx proxy)
- **App-only**: http://localhost:8080
- **API**: http://localhost:3001/api
- **Health**: http://localhost:3001/api/health

For detailed Docker usage instructions, see [DOCKER_USAGE.md](DOCKER_USAGE.md).

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
=======
# Sowl User Reports



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

- [ ] [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
- [ ] [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://gitlab.scholarshipowl.tech/sowldashboard/sowl-user-reports.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

- [ ] [Set up project integrations](https://gitlab.scholarshipowl.tech/sowldashboard/sowl-user-reports/-/settings/integrations)

## Collaborate with your team

- [ ] [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
- [ ] [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
- [ ] [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
- [ ] [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
- [ ] [Set auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)

## Test and Deploy

Use the built-in continuous integration in GitLab.

- [ ] [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/)
- [ ] [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
- [ ] [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
- [ ] [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
- [ ] [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
>>>>>>> 65d45a0 (Initial commit)
