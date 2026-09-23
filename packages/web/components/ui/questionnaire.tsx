import * as React from "react"
import { Field, FieldError, FieldLabel, File, FileLabel, FileInput, Form, FormControl, FormDescription, FormField, FormItem, Label, Textarea } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface QuestionnaireProps {
  onSubmit: (values: any) => void
}

export function Questionnaire({ onSubmit }: QuestionnaireProps) {
  const [values, setValues] = React.useState({
    name: "",
    email: "",
    age: "",
    gender: "",
    feedback: "",
    newsletter: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(values)
  }

  return (
    <Form onSubmit={handleSubmit}>
      <FormField
        control={Form.control({ defaultValues: values })}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Jane Doe" {...field} />
            </FormControl>
            <FormDescription>Please enter your full name.</FormDescription>
          </FormItem>
        )}
      />
      <FormField
        control={Form.control({ defaultValues: values })}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="jane@example.com" type="email" {...field} />
            </FormControl>
            <FormDescription>We'll never share your email.</FormDescription>
          </FormItem>
        )}
      />
      <FormField
        control={Form.control({ defaultValues: values })}
        name="age"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Age</FormLabel>
            <FormControl>
              <Input type="number" placeholder="25" {...field} />
            </FormControl>
            <FormDescription>Must be a number.</FormDescription>
          </FormItem>
        )}
      />
      <FormField
        control={Form.control({ defaultValues: values })}
        name="gender"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gender</FormLabel>
            <FormControl>
              <RadioGroup {...field} row>
                <RadioGroupItem value="male">Male</RadioGroupItem>
                <RadioGroupItem value="female">Female</RadioGroupItem>
                <RadioGroupItem value="other">Other</RadioGroupItem>
              </RadioGroup>
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={Form.control({ defaultValues: values })}
        name="feedback"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Feedback</FormLabel>
            <FormControl>
              <Textarea placeholder="What do you think?" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={Form.control({ defaultValues: values })}
        name="newsletter"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Checkbox {...field} />
              <Label>Subscribe to newsletter</Label>
            </FormControl>
          </FormItem>
        )}
      />
      <Button type="submit">Submit</Button>
    </Form>
  )
}