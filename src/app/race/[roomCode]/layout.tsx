import Header from "@/components/Header";

export default function RaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto min-h-svh px-4 xs:w-[450px] sm:w-[600px] md:w-[740px] lg:w-[980px] xl:w-[1200px]">
      <Header />
      <div className="mt-8">{children}</div>
    </div>
  );
}
