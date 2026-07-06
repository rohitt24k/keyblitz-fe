import Header from "@/components/Header";
import RestartButton from "@/components/RestartButton";

export default function TypingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="px-4 xs:w-[450px] sm:w-[600px] md:w-[740px] lg:w-[980px] xl:w-[1200px] mx-auto h-svh">
      <Header />
      <div className="mt-8">{children}</div>
      <RestartButton />
    </div>
  );
}
