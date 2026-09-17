import { getQueueTaskById } from "../../actions";
import { notFound } from "next/navigation";
import PrepareTaskClient from "./PrepareTaskClient";

export default async function PreparePublicationPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const task = await getQueueTaskById(params.id);

  if (!task) {
    notFound();
  }

  return <PrepareTaskClient task={task} />;
}
