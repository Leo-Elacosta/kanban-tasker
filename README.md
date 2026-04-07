📝 Tasker - Modern Kanban Board
Tasker is a high-performance, sleek Kanban-style task management application designed for focus and fluid productivity. Built with a "user-first" philosophy, it features multi-board support, customizable columns, and a persistent real-time database.

🚀 Live on Vercel
This project is optimized and ready for Vercel. You can deploy your own instance with a single click or view the live version at your project's Vercel URL.

🛠️ Tech Stack
Framework: Next.js (App Router & Client Components)

Backend & Auth: Supabase (PostgreSQL + Realtime sync)

Styling: Tailwind CSS

Drag & Drop: @hello-pangea/dnd

Icons: Lucide React

Language: TypeScript

✨ Key Features
Multi-Board Management: Organize different projects within separate boards.

Dynamic Columns: Create, rename, and delete columns (e.g., "To Do", "In Progress", "Done").

Advanced Priority System: Visual feedback based on task "Gravity" with custom glow effects:

🟢 Normal: Subtle green highlight.

🟠 Important: Intense Amber glow for high-visibility.

🔴 Urgent: Vibrant Red shadow for critical tasks.

Fluid Drag & Drop: Move tasks between columns seamlessly with automatic database persistence.

Smart UI/UX:

Expandable task descriptions.

Responsive sidebar for board navigation.

Confirmation modals for data safety.

Toast notifications for real-time actions.

⚙️ Installation & Setup
Clone the repository:

Bash
git clone https://github.com/your-username/tasker.git
Install dependencies:

Bash
npm install
Environment Variables:
Create a .env.local file in the root directory and add your Supabase credentials:

Snippet de código
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
Run Development Server:

Bash
npm run dev
Open http://localhost:3000 to see the magic happen.

Built with ☕ and precision by Leandro Lima.