-- Initializes necessary table creation for empty database.
CREATE TABLE IF NOT EXISTS users_lite(
  username varchar(30) PRIMARY KEY,
  modulus varchar(683) NOT NULL
);

CREATE TABLE IF NOT EXISTS users(
  username varchar(30) PRIMARY KEY,
  modulus varchar(683) NOT NULL,
  display_name varchar(25),
  bio varchar(300),
  pfp_hash varchar(64),
  banner_hash varchar(64),
  salt varchar(16) NOT NULL,
  login_ciphertext varchar(5000) NOT NULL,
  settings varchar(64) NOT NULL,
  post_time timestamptz NOT NULL,
  rsa_signature varchar(1024) NOT NULL,
  creation_signature varchar(1024) NOT NULL
);

CREATE TABLE IF NOT EXISTS groups(
  group_name varchar(30) PRIMARY KEY,
  group_owner varchar(30) NOT NULL,
  public BOOLEAN NOT NULL,
  group_description varchar(300),
  tags varchar(20)[],
  links varchar(200)[],
  rules varchar(1000)[],
  moderators varchar(30)[],
  photo_hash varchar(64),
  banner_hash varchar(64),
  color varchar(7) NOT NULL,
  post_time timestamptz NOT NULL,
  rsa_signature varchar(1024) NOT NULL,
  signator varchar(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS posts(
  post_id varchar(64) PRIMARY KEY,
  post_title varchar(100),
  post_text varchar(15000) NOT NULL,
  post_time timestamptz NOT NULL,
  post_type boolean NOT NULL,
  username varchar(30) NOT NULL,
  group_name varchar(20),
  photo_hash varchar(64)[],
  rsa_signature varchar(1024) NOT NULL
);

CREATE TABLE IF NOT EXISTS post_comments(
  post_id varchar(64) PRIMARY KEY,
  post_text varchar(300) NOT NULL,
  post_time timestamptz NOT NULL,
  username varchar(30) NOT NULL,
  reference_id varchar(64) NOT NULL,
  rsa_signature varchar(1024) NOT NULL
);

CREATE TABLE IF NOT EXISTS comment_comments(
  post_id varchar(64) PRIMARY KEY,
  post_text varchar(300) NOT NULL,
  post_time timestamptz NOT NULL,
  username varchar(30) NOT NULL,
  reference_id varchar(64) NOT NULL,
  rsa_signature varchar(1024) NOT NULL
);

CREATE TABLE IF NOT EXISTS followers(
  follower varchar(30) NOT NULL,
  followee varchar(30) NOT NULL,
  post_time timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS likes(
  username varchar(30) NOT NULL,
  post_id varchar(64) NOT NULL,
  liked BOOLEAN NOT NULL,
  post_time timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS group_followers(
  group_name varchar(20) NOT NULL,
  follower varchar(30) NOT NULL,
  post_time timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS events(
  event_id varchar(64) PRIMARY KEY,
  event_name varchar(50) NOT NULL,
  event_description varchar(300),
  event_time timestamp,
  country varchar(50),
  city varchar(50),
  tags varchar(20)[],
  post_time timestamptz NOT NULL,
  group_name varchar(20),
  creator varchar(30) NOT NULL,
  rsa_signature varchar(1024) NOT NULL
);

CREATE TABLE IF NOT EXISTS bundles(
  bundle_id varchar(43) PRIMARY KEY,
  height integer NOT NULL,
  synced boolean NOT NULL,
  moat varchar(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS invites(
  invite_id varchar(64) PRIMARY KEY,
  username varchar(30) NOT NULL,
  invite varchar(10000) NOT NULL,
  invite_key varchar(2000) NOT NULL,
  post_time timestamptz NOT NULL
);