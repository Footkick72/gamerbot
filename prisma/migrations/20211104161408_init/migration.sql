-- CreateTable
CREATE TABLE "Config" (
    "guildId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "allowSpam" BOOLEAN NOT NULL DEFAULT false,
    "egg" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "WelcomeMessage" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "guildId" TEXT NOT NULL,
    "json" JSONB NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "WelcomeMessage_pkey" PRIMARY KEY ("channelId")
);

-- CreateTable
CREATE TABLE "LogChannel" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "subscribedEvents" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "LogChannel_pkey" PRIMARY KEY ("channelId")
);

-- CreateTable
CREATE TABLE "EggLeaderboard" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "userTag" TEXT NOT NULL,
    "collected" BIGINT NOT NULL DEFAULT 0,
    "balance" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "EggLeaderboard_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MinecraftPlayer" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "minecraftIdentifier" TEXT NOT NULL,

    CONSTRAINT "MinecraftPlayer_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ReactionRoleMessage" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "guildId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,

    CONSTRAINT "ReactionRoleMessage_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "ReactionRole" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "messageId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,

    CONSTRAINT "ReactionRole_pkey" PRIMARY KEY ("roleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "WelcomeMessage_guildId_key" ON "WelcomeMessage"("guildId");

-- AddForeignKey
ALTER TABLE "WelcomeMessage" ADD CONSTRAINT "WelcomeMessage_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Config"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogChannel" ADD CONSTRAINT "LogChannel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Config"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReactionRoleMessage" ADD CONSTRAINT "ReactionRoleMessage_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Config"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReactionRole" ADD CONSTRAINT "ReactionRole_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ReactionRoleMessage"("messageId") ON DELETE CASCADE ON UPDATE CASCADE;
