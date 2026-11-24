import { UpdateUserDto } from './dto/user.dto';

const EDITABLE = ['name', 'avatar', 'phone', 'hasNotificationsEnabled', 'hasLocationEnabled'] as const;

type ProfileChanges = Pick<UpdateUserDto, (typeof EDITABLE)[number]>;

/** The only fields a user may change on their own account; everything else in the body is ignored. */
export function pickProfileChanges(dto: UpdateUserDto): ProfileChanges {
  const changes: ProfileChanges = {};
  for (const key of EDITABLE) {
    if (dto[key] !== undefined) Object.assign(changes, { [key]: dto[key] });
  }
  return changes;
}
