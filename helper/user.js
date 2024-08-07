import UserModel from "../models/UserModel.js";

const getUserByUuid = async (uuid) => {
  try {
    console.log(uuid);
    const user = await UserModel.findOne({ uuid });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  } catch (error) {
    console.error("Error fetching user by UUID:", error);
    throw new Error("Error fetching user by UUID");
  }
};

export { getUserByUuid };
