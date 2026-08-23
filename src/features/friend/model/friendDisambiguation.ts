interface FriendProfileIdentity {
  department: string | null;
  id: string;
  nickname: string;
}

export const getDuplicateFriendProfileIds = (
  profiles: ReadonlyArray<FriendProfileIdentity>,
) => {
  const counts = new Map<string, number>();
  profiles.forEach(profile => {
    const key = JSON.stringify([profile.nickname, profile.department]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return new Set(
    profiles
      .filter(profile => {
        const key = JSON.stringify([profile.nickname, profile.department]);
        return counts.get(key)! > 1;
      })
      .map(profile => profile.id),
  );
};
