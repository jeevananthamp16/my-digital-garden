import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import NotesApp from '@/components/NotesApp';
import SignOutButton from '@/components/SignOutButton';

export default async function AdminPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div>
      <div className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Logged in as <strong className="text-gray-900 dark:text-white">{session.user.email}</strong>
        </span>
        <SignOutButton />
      </div>
      <NotesApp />
    </div>
  );
}
