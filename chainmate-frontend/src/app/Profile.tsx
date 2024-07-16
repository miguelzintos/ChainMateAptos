import React from 'react';
import { Profile } from './chainmateService';

interface ProfileProps {
  profile: Profile;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const Profile: React.FC<ProfileProps> = ({ profile, onSwipeLeft, onSwipeRight }) => {
  return (
    <div>
      <h2>{profile.id}</h2>
      <p>Age: {profile.age}</p>
      <p>Bio: {profile.bio}</p>
      <button onClick={onSwipeLeft}>Swipe Left</button>
      <button onClick={onSwipeRight}>Swipe Right</button>
    </div>
  );
};

export default Profile;