import { resetDesk } from "./desk-store";
import { clearIdeas } from "./ideas";
import { resetProfile } from "./profile";
import { clearLegacyDeskKeys } from "./storage";
import { resetUsers } from "./users";

export function erasePlatform() {
  resetUsers();
  resetDesk();
  clearLegacyDeskKeys();
  clearIdeas();
  resetProfile();
}
