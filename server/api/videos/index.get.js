export default defineEventHandler(async () => {
  return prisma.video.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
});