import type { AnnixOrbitProfile } from "../entities/annix-orbit-profile.entity";
import type { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CvNotificationService } from "../services/cv-notification.service";
import { NotificationController } from "./notification.controller";

// The endpoint now reads/writes the Orbit PROFILE (cv_assistant_profiles), where
// the prefs already live (M5) — replacing the silently-broken cv_assistant_users
// path. The controller is a thin delegate; the contract lives in the service.
function build() {
  const profileRepo = {
    findByUserId: jest.fn(async (_id: number) => null as AnnixOrbitProfile | null),
    setNotificationPreferences: jest.fn(async () => undefined),
  };
  const noop = {} as never;
  const service = new CvNotificationService(
    profileRepo as unknown as AnnixOrbitProfileRepository,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
  );
  const controller = new NotificationController(service);
  return { controller, profileRepo };
}

const req = { user: { id: 1 } };

describe("NotificationController preferences (M5 — backed by the Orbit profile)", () => {
  it("GET returns the stored profile prefs", async () => {
    const { controller, profileRepo } = build();
    profileRepo.findByUserId.mockResolvedValue({
      matchAlertThreshold: 55,
      digestEnabled: false,
      pushEnabled: true,
    } as AnnixOrbitProfile);

    await expect(controller.preferences(req)).resolves.toEqual({
      matchAlertThreshold: 55,
      digestEnabled: false,
      pushEnabled: true,
    });
  });

  it("GET returns the 80/true/false defaults when no profile exists", async () => {
    const { controller, profileRepo } = build();
    profileRepo.findByUserId.mockResolvedValue(null);

    await expect(controller.preferences(req)).resolves.toEqual({
      matchAlertThreshold: 80,
      digestEnabled: true,
      pushEnabled: false,
    });
  });

  it("PATCH persists to the profile (threshold clamped 0–100) and returns the message", async () => {
    const { controller, profileRepo } = build();
    profileRepo.findByUserId.mockResolvedValue({} as AnnixOrbitProfile);

    const result = await controller.updatePreferences(req, {
      matchAlertThreshold: 150,
      digestEnabled: false,
    });

    expect(result).toEqual({ message: "Notification preferences updated" });
    expect(profileRepo.setNotificationPreferences).toHaveBeenCalledWith(1, {
      matchAlertThreshold: 100,
      digestEnabled: false,
    });
  });

  it("PATCH is NO LONGER a no-op — a present profile is updated", async () => {
    const { controller, profileRepo } = build();
    profileRepo.findByUserId.mockResolvedValue({} as AnnixOrbitProfile);

    await controller.updatePreferences(req, { pushEnabled: true });

    expect(profileRepo.setNotificationPreferences).toHaveBeenCalledTimes(1);
    expect(profileRepo.setNotificationPreferences).toHaveBeenCalledWith(1, { pushEnabled: true });
  });

  it("PATCH on a missing profile logs + no-ops (does not 500, does not write)", async () => {
    const { controller, profileRepo } = build();
    profileRepo.findByUserId.mockResolvedValue(null);

    await expect(controller.updatePreferences(req, { matchAlertThreshold: 50 })).resolves.toEqual({
      message: "Notification preferences updated",
    });
    expect(profileRepo.setNotificationPreferences).not.toHaveBeenCalled();
  });
});
