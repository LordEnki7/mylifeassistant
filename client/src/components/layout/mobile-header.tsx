import { Button } from "@/components/ui/button";
import { Icons } from "@/lib/icons";
import { useNavigation } from "@/hooks/use-navigation";

export default function MobileHeader() {
  const { toggleMobileMenu } = useNavigation();

  return (
    <header className="bg-primary-500 text-white shadow-lg lg:hidden">
      <div className="flex items-center justify-between p-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-primary-600 p-2"
          onClick={toggleMobileMenu}
        >
          <Icons.menu className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-semibold">My Life Assistant</h1>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-primary-600 p-2"
        >
          <Icons.bell className="h-6 w-6" />
        </Button>
      </div>
    </header>
  );
}
