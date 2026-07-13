'use client';

import { LogOutIcon, SettingsIcon, User, UserPenIcon } from 'lucide-react';

import { useSettings } from '@/contexts/settings-context';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTransition } from 'react';
import { signOut } from '@/actions/auth';

export default function UserMenu() {
  const { settings } = useSettings();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
          <Avatar>
            <AvatarFallback>
              <User size={20} className="opacity-60" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-64" align="end">
        <DropdownMenuLabel className="flex min-w-0 flex-col">
          <span className="text-foreground truncate text-sm font-medium">
            {settings.fullName}
          </span>
          <span className="text-muted-foreground truncate text-xs font-normal">
            {settings.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* <DropdownMenuGroup>
          <DropdownMenuItem>
            <SettingsIcon size={16} className="opacity-60" aria-hidden="true" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <UserPenIcon size={16} className="opacity-60" aria-hidden="true" />
            <span>Profile</span>
          </DropdownMenuItem>
        </DropdownMenuGroup> */}
        {/* <DropdownMenuSeparator /> */}
        <LogoutButton />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const LogoutButton = () => {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await signOut();
    });
  };
  return (
    <DropdownMenuItem onClick={handleLogout} disabled={isPending}>
      <LogOutIcon size={16} className="opacity-60" aria-hidden="true" />
      <span>Logout</span>
    </DropdownMenuItem>
  );
};
