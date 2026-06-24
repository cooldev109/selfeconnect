import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/tip/$driverId")({
  component: () => <Outlet />,
});
